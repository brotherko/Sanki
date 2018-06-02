var LZString = (function() {
    var f = String.fromCharCode;
    var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var baseReverseDic = {};

    function getBaseValue(alphabet, character) {
        if (!baseReverseDic[alphabet]) {
            baseReverseDic[alphabet] = {};
            for (var i = 0; i < alphabet.length; i++) {
                baseReverseDic[alphabet][alphabet.charAt(i)] = i
            }
        }
        return baseReverseDic[alphabet][character]
    }
    var LZString = {
        decompressFromBase64: function(input) {
            if (input == null) return "";
            if (input == "") return null;
            return LZString._0(input.length, 32, function(index) {
                return getBaseValue(keyStrBase64, input.charAt(index))
            })
        },
        _0: function(length, resetValue, getNextValue) {
            var dictionary = [],
                next, enlargeIn = 4,
                dictSize = 4,
                numBits = 3,
                entry = "",
                result = [],
                i, w, bits, resb, maxpower, power, c, data = {
                    val: getNextValue(0),
                    position: resetValue,
                    index: 1
                };
            for (i = 0; i < 3; i += 1) {
                dictionary[i] = i
            }
            bits = 0;
            maxpower = Math.pow(2, 2);
            power = 1;
            while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++)
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1
            }
            switch (next = bits) {
                case 0:
                    bits = 0;
                    maxpower = Math.pow(2, 8);
                    power = 1;
                    while (power != maxpower) {
                        resb = data.val & data.position;
                        data.position >>= 1;
                        if (data.position == 0) {
                            data.position = resetValue;
                            data.val = getNextValue(data.index++)
                        }
                        bits |= (resb > 0 ? 1 : 0) * power;
                        power <<= 1
                    }
                    c = f(bits);
                    break;
                case 1:
                    bits = 0;
                    maxpower = Math.pow(2, 16);
                    power = 1;
                    while (power != maxpower) {
                        resb = data.val & data.position;
                        data.position >>= 1;
                        if (data.position == 0) {
                            data.position = resetValue;
                            data.val = getNextValue(data.index++)
                        }
                        bits |= (resb > 0 ? 1 : 0) * power;
                        power <<= 1
                    }
                    c = f(bits);
                    break;
                case 2:
                    return ""
            }
            dictionary[3] = c;
            w = c;
            result.push(c);
            while (true) {
                if (data.index > length) {
                    return ""
                }
                bits = 0;
                maxpower = Math.pow(2, numBits);
                power = 1;
                while (power != maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++)
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1
                }
                switch (c = bits) {
                    case 0:
                        bits = 0;
                        maxpower = Math.pow(2, 8);
                        power = 1;
                        while (power != maxpower) {
                            resb = data.val & data.position;
                            data.position >>= 1;
                            if (data.position == 0) {
                                data.position = resetValue;
                                data.val = getNextValue(data.index++)
                            }
                            bits |= (resb > 0 ? 1 : 0) * power;
                            power <<= 1
                        }
                        dictionary[dictSize++] = f(bits);
                        c = dictSize - 1;
                        enlargeIn--;
                        break;
                    case 1:
                        bits = 0;
                        maxpower = Math.pow(2, 16);
                        power = 1;
                        while (power != maxpower) {
                            resb = data.val & data.position;
                            data.position >>= 1;
                            if (data.position == 0) {
                                data.position = resetValue;
                                data.val = getNextValue(data.index++)
                            }
                            bits |= (resb > 0 ? 1 : 0) * power;
                            power <<= 1
                        }
                        dictionary[dictSize++] = f(bits);
                        c = dictSize - 1;
                        enlargeIn--;
                        break;
                    case 2:
                        return result.join('')
                }
                if (enlargeIn == 0) {
                    enlargeIn = Math.pow(2, numBits);
                    numBits++
                }
                if (dictionary[c]) {
                    entry = dictionary[c]
                } else {
                    if (c === dictSize) {
                        entry = w + w.charAt(0)
                    } else {
                        return null
                    }
                }
                result.push(entry);
                dictionary[dictSize++] = w + entry.charAt(0);
                enlargeIn--;
                w = entry;
                if (enlargeIn == 0) {
                    enlargeIn = Math.pow(2, numBits);
                    numBits++
                }
            }
        }
    };
    return LZString
})();

String.prototype.splic = function(f) {
    return LZString.decompressFromBase64(this).split(f)
};

function decode(p, a, c, k, e, d) {
    e = function(c) {
        return (c < a ? "" : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36))
    };
    if (!''.replace(/^/, String)) {
        while (c--) d[e(c)] = k[c] || e(c);
        k = [function(e) {
            return d[e]
        }];
        e = function() {
            return '\\w+'
        };
        c = 1;
    };
    while (c--)
        if (k[c]) p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]);

    return p
}
const rp = require('request-promise-native')
async function test(){
    let html = await rp('https://tw.manhuagui.com/comic/5060/249045.html');
    let chapter = parseChapter(html);     
}
function parseChapter(html){
    let encodeParams = html.match(/\('1l.1m\((.*)\)\.2C\(\);',(.*),(.*),\'(.*),(.*),(.*)\)\) \<\/script\>/);
    encodeParams = encodeParams.slice(1)
    encodeParams[1] = parseInt(encodeParams[1])
    encodeParams[2] = parseInt(encodeParams[2])
    encodeParams[3] = eval('\''+encodeParams[3])
    encodeParams[4] = parseInt(encodeParams[4])
    encodeParams[5] = {}
    let damn = ['{"1n":1k,"1h":"1i","1j":"1s.2","1t":1u,"1r":"1o","1p":["1q.2.3","1g.2.3","16.2.3","17.2.3","18.2.3","15.2.3","12.2.3","13.2.3","14.2.3","1d.2.3","1e.2.3","1f.2.3","1c.2.3","19.2.3","1a.2.3","1b.2.3","1v-1.2.3","1P.2.3","1Q.2.3","1R.2.3","1O.2.3","1L.2.3","1M.2.3","1N.2.3","1W.2.3","1X.2.3","1Y.2.3","1V.2.3","1S.2.3","1T.2.3","1U.2.3","1K.2.3","1A.2.3","1B.2.3","1C.2.3","1z.2.3","1w.2.3","1x.2.3","1y.2.3","1H.2.3","1I.2.3","1J.2.3","1G.2.3","1D.2.3","1E.2.3","1F.2.3","n.2.3","o.2.3","p.2.3","m.2.3","j.2.3","k.2.3","l.2.3","q.2.3","v.2.3","w.2.3","x.2.3","u.2.3","r.2.3","s.2.3","t.2.3","i.2.3","8.2.3","6.2.3","7.2.3","5.2.3","4.2.3","9.2.3","f.2.3","g.2.3","h.2.3","e.2.3","a.2.3","b.2.3","d.2.3","y.2.3","S.2.3","T.2.3","U.2.3","R.2.3","O.2.3","P.2.3","Q.2.3","Z.2.3","10.2.3","11.2.3","Y.2.3","V.2.3","W.2.3","X.2.3","N.2.3","D.2.3","E.2.3","F.2.3","C.2.3","z.2.3","A.2.3","B.2.3","K.2.3","L.2.3","M.2.3","J.2.3","G.2.3","H.2.3","I.2.3","1Z.2.3","34.2.3","3f.2.3","3g.2.3","3h.2.3","3e.2.3","3b.2.3","3c.2.3","3d.2.3","3m.2.3","3n.2.3","3o.2.3","3l.2.3","3i.2.3","3j.2.3","3k.2.3","3a.2.3","30.2.3","31.2.3","32.2.3","2Z.2.3","2W.2.3","2X.2.3","2Y.2.3","37.2.3","38.2.3","39.2.3","36.2.3","33.2.3","35.2.3","3I.2.3","3J.2.3","3K.2.3","3H.2.3","3E.2.3","3F.2.3","3G.2.3","3L.2.3","3Q.2.3","3R.2.3","3P.2.3","3N.2.3","3O.2.3","3M.2.3","3D.2.3","3t.2.3","3u.2.3","3v.2.3","3s.2.3","3p.2.3","3q.2.3","3r.2.3","3A.2.3","3B.2.3","3C.2.3","3z.2.3","3w.2.3","3x.2.3","3y.2.3","2j.2.3","2k.2.3","2l.2.3","2i.2.3","2f.2.3","2g.2.3","2h.2.3","2q.2.3","2r.2.3","2s.2.3","2p.2.3","2m.2.3","2n.2.3","2o.2.3","2e.2.3","24.2.3","25.2.3","26.2.3","23.2.3","20.2.3","21.2.3","22.2.3","2b.2.3","2c.2.3","2d.2.3","2a.2.3","27.2.3","28.2.3","29.2.3","2M.2.3","2N.2.3","2O.2.3","2L.2.3","2I.2.3","2J.2.3","2K.2.3","2T.2.3","2U.2.3","2V.2.3","2S.2.3","2P.2.3"],"2Q":2R,"2H":2x,"2y":"/2z/c/2w/2t/","2u":0,"2v":"","2E":2F,"2G":0,"2D":{"2A":"2B"}}',62,240,'D7BWAcHNgdwUwEbmABgGxtWgrFgzFgCxYBMWA7KuWSuQVcbQIxYAcWAnFSliytj359sNQlxSFMEyhPb8C/OdnFpB2GdkbZc/KeR0cDUjjI6MOfDjQ4EmKMndsTgdy3I5c7gjoNa++rDTk4uR6MuRyrDKskeKsUqwKrIysOuiotBly/Bk0KArOKEwKTIxMOkx54naoTHxFwAgAdgCGALZwwIAK+YAU5oAGloAjaYAhboB+DoB9aY3gAJYAxsACqsAAygCyABLAU22QACItAC4tjVMAJsCANN4oKIDuysAAZlMANnAAzhk8M60d8+goAPocdgzU7AEhiCQVKR4KEyPByPA6PA0PAKPCMQgKQjonSEZHiQiCQh8PB8EikmgkBQkQRMGRMORMcQkOQkcR4QQkGRg1AkHQkTB2XD02zJFypMUOYJinj0liMmUWFxWMWeeJiyj09i0rVoHWecgytAatDEJg4FwYFz6K0C8ga8im8hy6hWgrAF6HfYAVzeCEeAHsZgBrP4zOafR4ALwAjm0mgAPE6RpqgnLgA4AC2A4BeLDaJ1waDWAHUmABBSNoGaQbAAJwAKgA5ACiazu8b+AEl1mXs7W4J2mlN9u7HsAmnB4/tO2cwbjFeB+wA3GfAZ4pxkawFKzwcAU2JWmwyp4gPIcvDNwM53FqPF6dakEak8aksakOfkuTlfrW8r8f2xuWKJwBTRFwkS/Tx2XAuUyRcOp4IcYp4JlTI7C1FBPHpeDPGpeCNVKeChTNFxNFIoVsAFbBbAEUi5REC05TQBw0FsRZyg1bAtWUFwxHAzwCV4uU4XAoVoXAjVcV4rVJF4yShQxXjCCAA=='['\x73\x70\x6c\x69\x63']('\x7c'),0,{}]
    for(var i = 0; i<damn.length; i++){
        console.log(damn[i] === encodeParams[i], damn[i], encodeParams[i])
    }
    console.log(decode(...encodeParams))
}
test()
module.exports = decode