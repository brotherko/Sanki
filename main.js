const logger = require('winston');
const phantom = require('phantom');
const decodeMHG = require('./platform/manhuagui/decodeMHG');
const rp = require('request-promise');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const inquirer = require('inquirer');

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
        encodeParams = encodeParams.slice(1)
        encodeParams[1] = parseInt(encodeParams[1])
        encodeParams[2] = parseInt(encodeParams[2])
        encodeParams[3] = eval(encodeParams[3])
        encodeParams[4] = parseInt(encodeParams[4])
        encodeParams[5] = {}
        let raw = JSON.parse(decodeMHG(...encodeParams))
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
                let path = `${baseUrl}${imgs.path}${imgs.files[i]}?cid=${imgs.cid}&md5=${imgs.md5}`
                return new Promise((resolve, reject) => {
                    rp({
                        url: path,
                        encoding: null, // binary mode
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
                        fs.writeFile(`${chapterFolder}/${i}.jpg`, content, function(err) {
                            if(err){
                                chapter.progress.missingPages += i
                                logger.error('image IO error', err)
                            }
                            chapter.progress.downloadedPages += 1
                            logger.info(`page ${i} downloaded`)
                            return resolve(i)
                        })
                    })
                    .catch(function(err){
                        chapter.progress.missingPages += i
                        logger.error('can not fetch the image', err)
                        reject()
                    })
                })
            })
        }
        return tasks;
    }
    startDownloadTasks(tasks){
        Promise.all(tasks.map(task => task())).then(function(result){
            logger.info("finished")
        })
    }
    async downloadChapter(chapterUrl){
        logger.info('Parsing chapter HTML')
        let chapterMeta = await this.parseChapter(chapterUrl);
        logger.info('Preparing download tasks')
        let tasks = await this.prepareDownloadTasks(chapterMeta)
        logger.info('Start downloading')
        this.startDownloadTasks(tasks)
    }
};

(async function(){
    const sanki = new Sanki();
    inquirer.prompt([
        {
            type: 'input',
            name: 'mangaPath',
            message: "What is the path of the manga"
        }
    ]).then(async function(answers){
        const chapters = await sanki.getChapterUrls(answers.mangaPath);
        inquirer.prompt([{
            type: 'checkbox',
            name: 'chapters',
            message: 'Which chapter(s) you want to download?',
            choices: chapters.map(function(chapter){
                return {
                    name: chapter.name,
                    value: 'https://tw.manhuagui.com' + chapter.path //fix
                }
            })

        }]).then(function(answers){
            answers.chapters.map(function(selectedChapterUrl){
                sanki.downloadChapter(selectedChapterUrl)
            })
        })
    })
})()