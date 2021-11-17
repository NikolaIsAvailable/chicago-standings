import puppeteer from 'puppeteer'
import express from 'express'
import { writeFileSync } from 'fs'
import schedule from 'node-schedule'
import cors from 'cors'

import { createRequire } from "module"; // Bring in the ability to create the 'require' method
const require = createRequire(import.meta.url); // construct the require method
const Standings = require("./data/standings.json") // use the require method
const Schedule = require("./data/schedule.json") // use the require method

import http from 'http'
setInterval(function() {
    http.get("http://chicago-stats.herokuapp.com");
}, 300000);

let port = process.env.PORT || 5000;

const app = express();

app.use(
    cors({
        origin: "*",
    })
)

app.use(express.json());

const scrapStandings = async () => {
    console.log('Scrapping Standings...');

    const proxy = 'http://api.scraperapi.com?api_key=d5c26a0b82af872a505d3b353440306b&url=';
    const url = `${proxy}https://www.espn.com/nba/standings`;

    const newUrl = 'https://www.espn.com/nba/standings'

    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] })
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36')
    await page.goto(newUrl)
    const standings = await page.evaluate(() => {
        let standings = []
        let standingsEast = []
        let standingsWest = []
        let easternTeams = document.querySelectorAll('#fittPageContainer > div:nth-child(4) > div > div > section > div > section > div.tabs__wrapper.mv5 > div > section > div:nth-child(2) > div > div.flex > table > tbody > tr')

        let easternTeamsRatio = document.querySelectorAll('#fittPageContainer > div:nth-child(4) > div > div > section > div > section > div.tabs__wrapper.mv5 > div > section > div:nth-child(2) > div > div.flex > div > div.Table__Scroller > table > tbody > tr')

        let westernTeams = document.querySelectorAll('#fittPageContainer > div:nth-child(4) > div > div > section > div > section > div.tabs__wrapper.mv5 > div > section > div:nth-child(3) > div > div.flex > table > tbody > tr')

        let westernTeamsRatio = document.querySelectorAll('#fittPageContainer > div:nth-child(4) > div > div > section > div > section > div.tabs__wrapper.mv5 > div > section > div:nth-child(3) > div > div.flex > div > div.Table__Scroller > table > tbody > tr')
        
        easternTeamsRatio.forEach((easternTeamRatio, index)=> {
            standingsEast.push({ 
                teamPosition: index + 1,
                teamImg: easternTeams[index].querySelector('td div span a img')?.src,
                teamName: easternTeams[index].querySelector('td div span.hide-mobile')?.textContent,          
                teamWin: easternTeamRatio.querySelector('td:nth-of-type(1)')?.textContent,          
                teamLoose: easternTeamRatio.querySelector('td:nth-of-type(2)')?.textContent,          
                winRate: easternTeamRatio.querySelector('td:nth-of-type(3)')?.textContent,
            })
        }); 

        westernTeamsRatio.forEach((westernTeamRatio, index)=> {
            standingsWest.push({ 
                teamPosition: index + 1,
                teamImg: westernTeams[index].querySelector('td div span a img')?.src,
                teamName: westernTeams[index].querySelector('td div span.hide-mobile')?.textContent,          
                teamWin: westernTeamRatio.querySelector('td:nth-of-type(1)')?.textContent,          
                teamLoose: westernTeamRatio.querySelector('td:nth-of-type(2)')?.textContent,          
                winRate: westernTeamRatio.querySelector('td:nth-of-type(3)')?.textContent,
            })
        });
        
        standings.push(standingsEast)
        standings.push(standingsWest)

        return standings
    });
    console.log(standings);

    const tryOutData = [
        { 
            playerName: 'Stephen Curry',
            playerAverage: '28pts'
        },
        { 
            playerName: 'Jimmy Buttler',
            playerAverage: '23pts'
        },
    ]

    writeFileSync('./data/standings.json', JSON.stringify(standings))

    console.log('Scrapping done');
    await browser.close();
}

const scrapSchedule = async () => {
    console.log('Scrapping Schedule...');

    const proxy = 'http://api.scraperapi.com?api_key=d5c26a0b82af872a505d3b353440306b&url=';
    const url = `${proxy}https://www.espn.com/nba/team/schedule/_/name/chi`;

    const newUrl = 'https://www.espn.com/nba/team/schedule/_/name/chi'

    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] })
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36')
    await page.goto(url)
    const schedule = await page.evaluate(() => {
        let schedule = []

        let chicagoSchedule = document.querySelectorAll('#fittPageContainer > div.StickyContainer > div.page-container.cf > div > div > section > div > section > section > div > div > div > div.Table__Scroller > table > tbody > tr')
        
        chicagoSchedule.forEach((chicagoGame)=> {
            schedule.push({ 
                gameDate: chicagoGame.querySelector('td:nth-child(1) > span')?.textContent,
                whereAtGame: chicagoGame.querySelector('td:nth-child(2) > div > span:nth-child(1)')?.textContent,
                oppImg: chicagoGame.querySelector('td:nth-child(2) > div > span.tc.pr2 > a > img')?.src,
                oppName: chicagoGame.querySelector('td:nth-child(2) > div > span:nth-child(3) > a')?.textContent,
                gameResult: chicagoGame.querySelector('td:nth-child(3) > span.fw-bold')?.textContent,    
                gameScore: chicagoGame.querySelector('td:nth-child(3) > span.ml4')?.textContent,         
                winLoose: chicagoGame.querySelector('td:nth-child(4) > span')?.textContent,       
            })
        });

        return schedule
    });
    console.log(schedule);

    writeFileSync('./data/schedule.json', JSON.stringify(schedule))

    console.log('Scrapping done');
    await browser.close();
}

const standingJob = schedule.scheduleJob('*/17 6-7 * * *', scrapStandings);
const scheduleJob = schedule.scheduleJob('*/15 6-7 * * *', scrapSchedule);

app.get('/', (req, res) => {
    res.send('Hello API')
});

app.get('/standings', (req, res) => {
    res.json(Standings)
});

app.get('/schedule', (req, res) => {
    res.json(Schedule)
});

app.listen(port, () => {
    console.log(`Listening on port http://localhost:${port}`);
});
