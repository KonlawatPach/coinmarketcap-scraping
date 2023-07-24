const puppeteer = require("puppeteer");
const { convertArrayToCSV } = require('convert-array-to-csv');
var fs = require('fs');

//ต้องการเป็นสกุลเงิน BATH หรือไม่
const WANTBATHCURRENCY = true;

function csvSave(dataArrays){
    const header = ['NO', 'imageURL', 'Name', 'Price', '1h%', '24h%', '7d%', 'Market Cap', 'Volume(24h)', 'Circulating Supply'];
    const csvFromArrayOfArrays = convertArrayToCSV(dataArrays, {
        header,
        separator: ','
    });

    fs.writeFile('crypto.csv', csvFromArrayOfArrays, err =>{
        if(err){
            console.log(18, err);
        }
        console.log('csv saved successfuly');
    })
}

async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight - window.innerHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 1);
        });
    });
}

async function scraping(){
    const cointableelement = (index, postfix) => {
        return `#__next > div.sc-25a97560-1.cdPNnt > div.main-content > div.cmc-body-wrapper > div > div:nth-child(1) > div.sc-996d6db8-2.kQcCjW > table > tbody > tr:nth-child(${index}) ${postfix}`;
    }
    puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: [
            '--start-maximized',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--no-sandbox',
            '--ignore-certificate-errors',
        ],
    })
    .then( async (browser) => {
        let page = await browser.newPage();
        let dataArrays = [];

        await page.goto("https://coinmarketcap.com/", {
            waitUntil: "networkidle0",
        });
        page.setViewport({
            width: 1920,
            height: 1040,
            isMobile: false
        });

        //เปลี่ยนสกุลเงิน
        if(WANTBATHCURRENCY){
            await page.click('#__next > div.sc-25a97560-1.cdPNnt > div.main-content > div.sc-25a97560-0.jqezmE > div > div:nth-child(1) > div > div.sc-57ed43ab-0.fgFqBM.header-wrapper.topbar > div > div.sc-16891c57-0.geKVlt > div.sc-8aef48ae-0.jeTfll > div.sc-8aef48ae-1.iddlqM > button')
            await page.waitForTimeout(2000)
            await page.click('body > div.sc-628ff628-0.ghstkF.modalOpened > div > div.sc-628ff628-2.ggeShB.cmc-modal-body.has-title > div > div.sc-95c89bcc-0.kQQfdT > div:nth-child(3) > div > div:nth-child(29)')
            await page.waitForTimeout(2000)
        }


        //ไล่สแครปปิ้งโดยมี 100 รายการต่อหน้า และต้องการ 1000 รายการ
        for(let p=1; p<=10; p++){
            //scroll ไปสุดขอบจอ ให้หน้าโหลดก่อน
            await autoScroll(page);

            //มี 100 รายการต่อ 1 หน้า
            for(let i=1; i<=100; i++){
                let row = [];

                let element = await page.$(cointableelement(i, `> td:nth-child(4) > div`));
                if(element !== undefined || element !== null){
                    try {
                        //child 2 number
                        element = await page.$(cointableelement(i, "> td:nth-child(2) > p"));
                        text = await page.evaluate(element => element.textContent, element);
                        row.push(text)
        
                        //child 3 image & name
                        element = await page.$(cointableelement(i, "> td:nth-child(3) > div > a > div > img"));
                        text = await page.evaluate(element => element.src, element);
                        row.push(text)
                        element = await page.$(cointableelement(i, "> td:nth-child(3) > div > a > div > div > p"))
                        text = await page.evaluate(element => element.textContent, element);
                        row.push(text)
        
                        //child 4 price
                        element = await page.$(cointableelement(i, "> td:nth-child(4) > div"))
                        text = await page.evaluate(element => element.textContent, element);
                        if(text.includes("...")){
                            await element.hover();
                            await page.waitForTimeout(1000)
                            element = await page.$('.tippy-content')
                            text = await page.evaluate(element => element.textContent, element);
                        }
                        row.push(text)
        
                        //child 5 1h
                        element = await page.$(cointableelement(i, "> td:nth-child(5) > span"))
                        text = await page.evaluate(element => element.textContent, element);
                        row.push(text)
        
                        //child 6 24h
                        element = await page.$(cointableelement(i, "> td:nth-child(6) > span"))
                        text = await page.evaluate(element => element.textContent, element);
                        row.push(text)
        
                        //child 7 7d
                        element = await page.$(cointableelement(i, "> td:nth-child(7) > span"))
                        text = await page.evaluate(element => element.textContent, element);
                        row.push(text)
        
                        //child 8 market
                        element = await page.$(cointableelement(i, "> td:nth-child(8) > p > span.sc-f8982b1f-1.bOsKfy"))
                        text = await page.evaluate(element => element.textContent, element);
                        row.push(text)
        
                        //child 9 volume บางทีก็ไม่มีช่องนี้ในเว็บ
                        try {
                            element = await page.$(cointableelement(i, "> td:nth-child(9) > div > a > p"))
                            text = await page.evaluate(element => element.textContent, element);
                            row.push(text)
                        } catch (error) {
                            row.push('--')
                        }
                        
                        //child 10 circulating supple
                        element = await page.$(cointableelement(i, "> td:nth-child(10) > div > div > p"))
                        text = await page.evaluate(element => element.textContent, element);
                        row.push(text)
        
                        //เก็บข้อมูลในรูป array 3D
                        dataArrays.push(row)
                        console.log(row);
                    } catch (error) {
                        console.log(error);
                        i--;
                    }
                }
                else{
                    break;
                }
            }

            //ครบ 1 หน้า คลิกเพื่อไปหน้าต่อไป
            await page.click('#__next > div.sc-25a97560-1.cdPNnt > div.main-content > div.cmc-body-wrapper > div > div:nth-child(1) > div.sc-aef7b723-0.sc-55b3ff54-0.grDBNR > div.sc-55b3ff54-4.tYiiX.hide_for_narrow > div > ul > li.next');
            await page.waitForTimeout(3000)
        }
        
        //บันทึกเป็น csv
        csvSave(dataArrays);
        await browser.close();
        })
        .catch((error) => {
            console.log(error)
    })
}

scraping()