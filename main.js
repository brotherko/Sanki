const phantom = require('phantom');
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
        this.instance = await phantom.create();
        this.page = await this.instance.createPage();
    }

    async getChapterUrls(url){
        
    }

    parseChapter(){
        const status = await this.page.open('https://tw.manhuagui.com/comic/5060/249045.html');
        const content = await this.page.property('content');
        const { document } = (new JSDOM(content)).window;
        return {
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
    }
    async downloadChapter(chapter){
        let chapter = parseChapter();
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
    await sanki.init()
    sanki.downloadChapter()
})()