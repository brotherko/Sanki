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
        let result = decodeMHG(encodeParams[0], encodeParams[1], encodeParams[2], encodeParams[3], encodeParams[4], encodeParams[5])
        return result
    }
    async downloadChapter(chapterUrl){
        const status = await this.page.open('https://tw.manhuagui.com/comic/5060/249045.html');
        logger.info('chapter opened')

        const html = await this.page.property('content');
        logger.info('content opened')
        let chapter = await this.parseChapter(html);
        logger.info('chapter info parsed')
        let img = chapter.dev.imgSrc.match(/^(https:\/\/.*\/)(\d{3}\.jpg)(.*$)/)
        let promises = [];
        for(let i = 0; i < chapter.data.totalPages; i++){
            let pageNum = i.pad(3);
            let path = img[1] + pageNum + ".jpg" + img[3];
            promises.push(rp({
                url: path,
                encoding: null,
                headers: {
                    'Referer': 'https://tw.manhuagui.com',
                }
            }).then(function(content){
                fs.writeFile("damn/" + pageNum + ".jpg", content, function(err) {
                    if(err){
                        chapter.data.missingPages += pageNum
                        console.log(err)
                    }
                    chapter.data.downloadedPages += 1
                })
            }).catch(function(err){
                chapter.data.missingPages += pageNum
            }))
        }
        Promise.all(promises).then(function(result){
            console.log(manga);
        })
    }
};

(async function(){
    const sanki = new Sanki();
    await sanki.test()
})()