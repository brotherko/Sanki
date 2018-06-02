const logger = require('winston');
const phantom = require('phantom');
const decodeMHG = require('./decodeMHG');
const rp = require('request-promise');
const { JSDOM } = require('jsdom');
const fs = require('fs');

Number.prototype.pad = function(size) {
    var s = String(this);
    while (s.length < (size || 2)) {s = "0" + s;}
    return s;
}

class Sanki {
    constructor(){
        this.baseFolder = 'manga';
    }

    async init(){
        logger.info('init phantom');
        this.instance = await phantom.create();
        this.page = await this.instance.createPage();
    }

    async getChapterUrls(url){
        
    }

    async _parseChapter(html){
        const { document } = (new JSDOM(html)).window;
        const parsedChapter = {
            data: {
                name: document.querySelector("body > div.w980.title > div:nth-child(2) > h1 > a").innerHTML,
                totalPages: document.querySelector("#pageSelect > option:last-child").value,
                chapter: document.querySelector("body > div.w980.title > div:nth-child(2) > h2").innerHTML, 
            }, 
            dev: {
                imgSrc: document.querySelector("#mangaFile").src, 
            },
            progress: {
                downloadedPages: 0,
                missingPages: [],
            },
            document: document,
        }
        logger.debug(parsedChapter);
        return parsedChapter 
    }
    async test(){
        let html = await rp('https://tw.manhuagui.com/comic/5060/249045.html');
        let chapter = this.parseChapter(html);     
    }
    async parseChapter(html){
        let encodeParams = html.match(/\('1l.1m\((.*)\)\.2C\(\);',(.*),(.*),(.*),(.*),(.*)\)\) \<\/script\>/);
        encodeParams = encodeParams.slice(1)
        encodeParams[1] = parseInt(encodeParams[1])
        encodeParams[2] = parseInt(encodeParams[2])
        encodeParams[3] = eval(encodeParams[3])
        encodeParams[4] = parseInt(encodeParams[4])
        encodeParams[5] = {}
        let raw = JSON.parse(decodeMHG(encodeParams[0], encodeParams[1], encodeParams[2], encodeParams[3], encodeParams[4], encodeParams[5]))
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
    downloadImage(chapter){
        let imgs = chapter.imgs
        let baseUrl = 'https://i.hamreus.com'
        let baseFolder = this.baseFolder
        let promises = [];
        for(let i = 0; i < imgs.files.length; i++){
            let path = `${baseUrl}${imgs.path}${imgs.files[i]}?cid=${imgs.cid}&md5=${imgs.md5}`
            promises.push(rp({
                url: path,
                encoding: null, // binary mode
                headers: {
                    'Referer': 'https://tw.manhuagui.com', // fake referer
                }
            }).then(function(content){
                if(!fs.existsSync(`${baseFolder}/${chapter.name}`)){
                   fs.mkdirSync(`${baseFolder}/${chapter.name}`) 
                }
                if(!fs.existsSync(`${baseFolder}/${chapter.name}/${chapter.chapter}`)){
                   fs.mkdirSync(`${baseFolder}/${chapter.name}/${chapter.chapter}`) 
                }
                fs.writeFile(`${baseFolder}/${chapter.name}/${chapter.chapter}/${i}.jpg`, content, function(err) {
                    if(err){
                        chapter.progress.missingPages += i
                        logger.error('image IO error', err)
                    }
                    chapter.progress.downloadedPages += 1
                    logger.info(`${i} downloaded`)
                })
            }).catch(function(err){
                chapter.progress.missingPages += i
                logger.error('can not fetch the image', err)
            }))
        }
        Promise.all(promises).then(function(result){
            console.log("done");
        })
    }
    async downloadChapter(chapterUrl){
        const html = await rp('https://tw.manhuagui.com/comic/5060/249045.html');
        logger.info('html fetched')
        let chapter = await this.parseChapter(html);
        logger.info('chapter info parsed')
        this.downloadImage(chapter)
    }
};

(async function(){
    const sanki = new Sanki();
    await sanki.downloadChapter()
})()