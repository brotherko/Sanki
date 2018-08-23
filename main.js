const logger = require('winston');
const phantom = require('phantom');
const decodeMHG = require('./platform/manhuagui/decodeMHG');
const rp = require('request-promise');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const inquirer = require('inquirer');
const sharp = require('sharp');

logger.level = "debug"
Number.prototype.pad = function(size) {
    var s = String(this);
    while (s.length < (size || 2)) {s = "0" + s;}
    return s;
}

class Sanki {
    constructor(){
        this.baseFolder = 'manga';
    }

    getChapterUrls(mangaUrl){
        return rp(mangaUrl).then(async function(html){
            const { document } = (new JSDOM(html)).window;
            const index = [];
            document.querySelectorAll(".chapter-list a").forEach(function(chapter){
                index.push({ name: chapter.title, path: chapter.href })
            })
            return index
       })
    }

    async parseChapter(chapterUrl){
        const html = await rp(chapterUrl).catch((err) => logger.error(err));
        let encodeParams = html.match(/\('.*\..*\((.*)\)\..*\(\);',(.*),(.*),(.*),(.*),(.*)\)\) \<\/script\>/);
        logger.debug('encoded params', encodeParams)
        encodeParams = encodeParams.slice(1)
        encodeParams[1] = parseInt(encodeParams[1])
        encodeParams[2] = parseInt(encodeParams[2])
        encodeParams[3] = eval(encodeParams[3])
        encodeParams[4] = parseInt(encodeParams[4])
        encodeParams[5] = {}
        let raw = JSON.parse(decodeMHG(...encodeParams))
        logger.debug('raw json', raw)
        let json = {
            name: raw.bname,
            totalPages: raw.len,
            chapter: raw.cname, 
            cover: raw.bpic,
            imgs: {
                path: raw.path,
                files: raw.files,
                md5: raw.sl.md5,
                cid: raw.cid,
            },
            progress: {
                downloadedPages: 0,
                missingPages: [],
            },
        }
        return json 
    }

    prepareDownloadTasks(chapter){
        let imgs = chapter.imgs
        let baseUrl = 'https://i.hamreus.com'
        let mangaFolder = `${this.baseFolder}/${chapter.name}`
        let chapterFolder = `${mangaFolder}/${chapter.chapter}`
        let tasks = [];
        for(let i = 0; i < chapter.imgs.files.length; i++){
            tasks.push(() => {
                let path = baseUrl + encodeURI(`${imgs.path}${imgs.files[i]}?cid=${imgs.cid}&md5=${imgs.md5}`);
                logger.debug('path ', path);
                return new Promise((resolve, reject) => {
                    rp({
                        url: path,
                        encoding: null,// binary mode
                        headers: {
                            'Referer': 'https://tw.manhuagui.com', // fake referer
                        }
                    })
                    .then(function(content){
                        if(!fs.existsSync(mangaFolder)){
                            fs.mkdirSync(mangaFolder) 
                        }
                        if(!fs.existsSync(chapterFolder)){
                            fs.mkdirSync(chapterFolder) 
                        }
                        sharp(content).toFile(`${chapterFolder}/${i}.jpg`).then(() => {
                            chapter.progress.downloadedPages += 1
                            logger.debug(`page ${i} downloaded`);
                            return resolve(i)
                        }).catch(err => {
                            chapter.progress.missingPages += i;
                            logger.error('image IO error', err)
                        })
                    })
                    .catch(function(err){
                        chapter.progress.missingPages += i
                        logger.error('can not fetch the image', path)
                        reject(i)
                    })
                })
            })
        }
        return tasks;
    }

    async downloadChapter(chapterUrl){
        logger.debug('Parsing chapter HTML')
        let chapterMeta = await this.parseChapter(chapterUrl);
        logger.debug('Parsed', chapterMeta)
        logger.debug('Preparing download tasks')
        let tasks = await this.prepareDownloadTasks(chapterMeta)
        logger.debug('Start downloading')
        Promise.all(tasks.map(task => task())).then(function(result){
            logger.info(`${chapterMeta.cname} ${chapterMeta.chapter} downloaded`)
        })
    }
};

(async function(){
    const sanki = new Sanki();
    inquirer.prompt([
        {
            type: 'input',
            name: 'mangaPath',
            message: "Path of the Manga from tw.manhuagui.com"
        }
    ]).then(async function(answers){
        const chapters = await sanki.getChapterUrls(answers.mangaPath);
        inquirer.prompt({
            type: 'checkbox',
            name: 'chapters',
            message: 'Which chapter(s) you want to download?',
            choices: [
                {
                    name: 'All',
                    value: 'all',
                },
                ...chapters.map(function(chapter){
                    return {
                        name: chapter.name,
                        value: 'https://tw.manhuagui.com' + chapter.path //fix
                    }
                })
            ]
        }).then(function(answers){
            let selectedChaptersUrl = (answers.chapters == 'all') ? chapters.map(chapter => 'https://tw.manhuagui.com' + chapter.path) : answers.chapters;
            selectedChaptersUrl.map(async function(selectedChapterUrl){
                await sanki.downloadChapter(selectedChapterUrl)
            })
        })
    })
})()