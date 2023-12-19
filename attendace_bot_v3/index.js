/**

 * import necessary libraries 

 * if not installed enter "npm install [library name]" in the terminal

 * troubleshooting:

 * @https://www.npmjs.com/package/puppeteer-chromium-resolver

 * https://stackoverflow.com/questions/74362083/cloud-functions-puppeteer-cannot-open-browser

 * https://github.com/puppeteer/puppeteer/issues/1597

 *

 * resources:

 * command to kill port: kill -9 $(lsof -t -i:8080)

 * https://www.kindacode.com/article/node-js-how-to-use-import-and-require-in-the-same-file/

 * https://brunoscheufler.com/blog/2021-05-31-locking-and-synchronization-for-nodejs

 * https://www.youtube.com/watch?v=PFJNJQCU_lo

 * https://dev.to/pedrohase/create-google-calender-events-using-the-google-api-and-service-accounts-in-nodejs-22m8

 */



// IMPORTS

import { createRequire } from "module";

const require = createRequire(import.meta.url);

import { Mutex } from 'async-mutex';

import { google } from 'googleapis';
import { promises as fs } from 'fs';

import { JWT } from 'google-auth-library';

import pAll from 'p-all';

import {
    publishMessage,
    replyMessage,
    findMessage,
    replyMessagewithrecord,
    getMessageByTsAndChannel,
} from "./slack.js";

const MailComposer = require('nodemailer/lib/mail-composer');



const prompt = require('prompt');

const puppeteerExtra = require('puppeteer-extra');

//const fs = require('fs').promises;

const path = require('path');

const { fileURLToPath } = require('url');

const _ = require('lodash');

const PCR = require("puppeteer-chromium-resolver");

const stealthPlugin = require('puppeteer-extra-plugin-stealth');

const schedule = require('node-schedule');

// const credentials = require('./gsa_credentials.json');

const database_credentials = require('./database_credentials.json');

const readline = require("readline-promise").default;

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const dotenv = require('dotenv');

dotenv.config();



// CONSTANTS

const mutex = new Mutex();



//Operation Calendar and Operation Email

const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

const TOKEN_PATH = "./token.json";

const CLIENT_SECRET_PATH = "./credentials.json";

const auth = await authorize();

const calendar = google.calendar({ version: "v3", auth });

const gmail = google.gmail({ version: 'v1', auth })



// People Database Constants

const spreadsheetId = "18tn8iR1wlBBI8aB1S_5KVRsnCz763JgXWxD9UvBKvME";

const ALLTABNAME = "All";

const ID_COLUMN = 1;

const NAME_COLUMN = 2;

const NICKNAME_COLUMN = 3;

const ROLE_COLUMN = 4;

const EMAIL_COLUMN = 5;

const PHONE_COLUMN = 6;

const FAMILYID_COLUMN = 7;

const GRADE_COLUMN = 8;




// const STUDENTTIME = 5 * 60 * 1000; //10 minutes

// const TUTORTIME = 3 * 60 * 1000; //5 minutes

// const BOTTIME = 1000; // 1 minute the start time

//FOR TESTING:

const STUDENTTIME = 2 * 60 * 1000; //2 minute 

const TUTORTIME = 1 * 60 * 1000; // 1 minute before the start time

const BOTTIME = 0 * 60 * 1000; // 0 min before the start time



const MONITORING_EMAIL = "bryan.monterrosa@modernsmart.com";

const OPERATION_EMAIL = "karla.valladares@modernsmart.com"; // this should be the operation account

const firefliesAccount = "ModernSmart Inc."; // this is for the firefly

const DATE_REGEX = /(\d?\d:\d\d):\d\d\s(\w\w)/;

//const CANCELLED_REGEX = /^\((C|c)ancel/;

const CANCELLED_REGEX = /cancel/gi;

const EMAIL = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

const ABSENT = 0;

const PRESENT = 1;

//const MONITORING_CHANNEL_ID = "C04EQQT98PN";

//const TEST_CHANNEL_ID = "C05D0U9S75J"; // USE THIS CHANNEL FOR TESTING

//const TEST_CHANNEL2_ID = "D05DWRVB000";

const UAT_CHANNEL_ID = "C05MZ2XBYAJ";

// // const prod_channel_ID = "C05QLMNNS1W";
//const prod_channel_ID = "C05MZ2XBYAJ";





class Event {

    title;

    startTime;

    endTime;

    meetLink;

    guests;

    id;



    constructor(title, startTime, endTime, meetLink, guests, id) {

        this.title = title;

        this.startTime = startTime;

        this.endTime = endTime;

        this.meetLink = meetLink;

        this.guests = guests;

        this.id = id;

    }

}


class Guest {

    name;

    nickname;

    role;

    email;

    phoneNumber;



    constructor(name = "", nickname = "", role = "", email = "", phoneNumber = "") {

        this.name = name;

        this.nickname = nickname;

        this.role = role;

        this.email = email;

        this.phoneNumber = phoneNumber;

    }

}


class AttendanceBot {

    context;

    page;



    constructor(context, page) {

        this.context = context;

        this.page = page;

    }



    /**

     * Initializes instance of Chromium using puppeteer

     * See puppeteer documentation @https://pptr.dev/ 

     * @returns AttendanceBot object

     */

    //https://dev.to/somedood/the-proper-way-to-write-async-constructors-in-javascript-1o8c

    static async initialize(browser) {

        const context = await browser.createIncognitoBrowserContext();

        const page = await context.newPage();

        return new AttendanceBot(context, page);

    }



    /**

     * Uses login credential to sign into Google account.

     * Goes to session URL and joins.

     * @param {*} meetLink 

     */

    async joinSession(title, meetLink, thread) {

        const page = this.page;

        const filePath = './cookies.json'



        // wait maximum amount of time for page to load

        await page.setDefaultTimeout(0);

        await page.setDefaultNavigationTimeout(0);



        // load cookies and try to use them, if unsuccessful, perform google login

        // try {

        //     const savedCookies = await loadCookies(filePath);

        //     if (areCookiesValid(savedCookies)) {

        //         await page.setCookie(...savedCookies);

        //     } else {

        //         throw Error("bad cookies");

        //     }

        // } catch (e) {

        //     console.log(e);



        // log into gmail account using .env credentials

        try {

            console.log("logging into gmail...");

            await page.goto('https://accounts.google.com/signin/v2/identifier', { waitUntil: 'load', timeout: 0 });

            console.log("typing email address");

            await page.type('[type="email"]', process.env.GMAIL);

            await page.click('#identifierNext');

            await sleep(5000);



            console.log("typing login password");

            await page.type('[type="password"]', process.env.PASSWORD);

            await page.click('#passwordNext');

            await sleep(5000);

        } catch (e) {

            console.log('logging into gmail failed', e);

            throw Error("unable to log in :(");

        }



        // }



        // save cookies (comment-out when deploying as cloud function because cookies.json becomes a read-only file)

        console.log("saving cookies...");

        mutex.runExclusive(() => saveCookies(page, filePath));



        // go to meet url

        console.log(`going to link @ ${meetLink}...`);

        await page.goto(meetLink, { waitUntil: 'load', timeout: 0 });



        // // continue without microphone and camera

        // console.log("dismissing popup");

        // await sleep(2000);

        // const popup = await page.waitForSelector('button[jsname="IbE0S"]', { visible: true });

        // await popup.click();

        // await popup.dispose();



        // join meet

        console.log(`joining ${title}...`)

        await sleep(2000);

        let count = 0;

        while (await this.isInMeet() === false && count < 5) {

            try {

                const joinButton = await page.waitForSelector('button[data-idom-class="nCP5yc AjY5Oe DuMIQc LQeN7 jEvJdc QJgqC"][jsname="Qx7uuf"]', { visible: true, timeout: 5 * 1000 });

                await joinButton.click();

                await joinButton.dispose();

            } catch (e) {

                console.log("retrying join...")

            }

            count++;

        }

        if (await this.isInMeet() === false) {

            // {"Kisun": U03MF2SAXMW, "Kwiseon": U03S548N206, "Grace": U04H80KMGRW, "Hyewon": U054EFX4FAM}

            sendMessage(thread, "<@U05M0P95AGZ> Unable to join 😔. Please check script.");
            // sendMessage(thread, "<@U05M0P95AGZ> Unable to join 😔. Please check script.");

            throw Error(`unable to join - ${title}`);

        }



        // open people tab

        console.log("opening people tab...");

        await page.evaluate(() => {

            document.querySelectorAll('[class="VfPpkd-Bz112c-LgbsSe yHy1rc eT1oJ JsuyRc boDUxc"]')[1].click();

        });

        console.log(`${title} joined!`);

        await sleep(1000);

    }



    async autoAdmit(interval) {

        const page = this.page;



        const elements = await page.$$('[class="VfPpkd-vQzf8d"]');

        elements.map(async element => {

            const text = await element.getProperty("textContent");

            const json = await text.jsonValue();

            if (json.toString() === "Admit") {

                await element.click();

            }

        });

        await sleep(interval)

    }


    // Post contact information for guest.

    async postContactGuest(thread, guestList) {
        let slackThread = thread;
        let logRecordsSet = new Set(); // Use a Set to store unique entries

        const PEOPLEDATABASE = await getGoogleSheetsData(spreadsheetId, ALLTABNAME);

        for (let guest of guestList) {
            // Skip checking monitoring email for the moment is my account
            // we will need to replace it by 'ModernSmart Team'
            if (guest.email == OPERATION_EMAIL) { continue; }

            let peopleData = getPersonFromData(PEOPLEDATABASE, guest.email, EMAIL_COLUMN);

            for (let personData of peopleData) {
                if (personData) {
                    var invitedName = personData[NAME_COLUMN - 1] || "No name";
                    var phoneNum = personData[PHONE_COLUMN - 1] || "";
                    var role = personData[ROLE_COLUMN - 1] || "No role";

                    // Construct the record
                    let record;
                    if (role == "parent" && phoneNum == "") {
                        record = `${capitalizeFirstLetter(role)}: ${guest.email}`;
                    } else if (role == "parent" && phoneNum != "") {
                        record = `${capitalizeFirstLetter(role)}: ${guest.email}, ${phoneNum}`;
                    } else if (role != "parent" && phoneNum != "") {
                        record = `${capitalizeFirstLetter(role)}: ${invitedName}, ${guest.email}, ${phoneNum}`;
                    } else {
                        record = `${capitalizeFirstLetter(role)}: ${invitedName}, ${guest.email}`;
                    }

                    logRecordsSet.add(record);
                } else {
                    // If personData is not defined, add the email directly
                    logRecordsSet.add(guest.email);
                }
            }
        }

        // Convert the Set back to an array and sort based on role
        const logRecordsArray = Array.from(logRecordsSet).sort((a, b) => {
            const roleA = a.substring(0, a.indexOf(':'));
            const roleB = b.substring(0, b.indexOf(':'));
            return roleA.localeCompare(roleB);
        });

        // Join the array into a string
        const logRecords = logRecordsArray.join('\n');

        sendMessage(slackThread, logRecords);
    }




    /**

     * When inside session, takes attendance by reading guest list

     * @param {*} meetLink 

     */

    async takeAttendance(thread, interval, guestList, startTime, fileName) {


        const page = this.page;

        let log = "";

        console.log('guestList inside take attandance')

        console.dir(guestList)

        let JSONwithTS = fileName

        let attendaceKeyinfo = "absenceTs";

        let absenceKeyTutor = "attendaceTuTorTs";

        let absenceKeyStudent = "attendaceStudentTs";

        let absenceKeyBot = "attendaceBotTs";

        // Scrape display names

        const targets = await page.$$("[class='zWGUib']");

        const promises = await targets.map(async element => {

            const text = await element.getProperty("textContent");

            const json = await text.jsonValue();

            const name = json.toString();

            if (name.match(EMAIL)) { // Absent guests will show up in meeting as their emails (only if guest list is visible)

                return { name, status: ABSENT };

            } else {

                return { name, status: PRESENT };

            }

        });





        const guests = await Promise.all(promises); // List of displayed guests 
        const { uniquePresent, uniqueMissing } = await createListGuest(guests, guestList);

        console.log('Outside the fucntion of createListGuest. \n Present user: ')
        console.dir(uniquePresent)
        console.log('absent users')
        console.dir(uniqueMissing)


        // Create and send attendance log for Slack

        log += await createLog(uniquePresent, uniqueMissing);

        //console.log("value to read JSON: ", JSONwithTS, attendaceKeyinfo)

        let replyID = await readJSONValue(JSONwithTS, attendaceKeyinfo)

        //console.log(replyID)

        let currentMEssage;

        if (replyID != "0") {

            currentMEssage = await getMessageByTsAndChannel(UAT_CHANNEL_ID, replyID);
        } else {
            currentMEssage = 'PM'
        }

        let textRecord1 = await removeAMorPM(currentMEssage);

        let textRecord2 = await removeAMorPM(log);

        //console.log("currentMEssage: ", textRecord1, typeof textRecord1, "log: ", textRecord2, typeof textRecord2)

        //console.log(findDifferences(textRecord1, textRecord2))

        //console.log(textRecord1 !== textRecord2);

        if (textRecord1 !== textRecord2) {

            sendMessagewithrecord(thread, log, attendaceKeyinfo, JSONwithTS);
        } else {
            // The string representations are the same, so no need to send a message.
            console.log("There is no change in the attendace.");
        }

        // Send notification messages if necessary

        console.log('absentees from the take attendace')

        console.dir(uniqueMissing)

        let newUniqueMissing = uniqueMissing.slice();
        let mergedObjects = {};

        // Loop through the copied array and merge objects by role
        newUniqueMissing.forEach(obj => {
            const { role } = obj;
            if (role) {
                if (!mergedObjects[role]) {
                    // If the role does not exist in mergedObjects, create an entry
                    mergedObjects[role] = { role, groups: [] };
                }
                // Add the object to the corresponding role in mergedObjects
                mergedObjects[role].groups.push({ name: obj.name, nickname: obj.nickname });
            }
        });

        // Convert the values of mergedObjects back to an array
        newUniqueMissing = Object.values(mergedObjects);
        const curTime = new Date();
        const newMeetingTime = new Date(startTime)
        const after30mins = new Date(newMeetingTime.getTime() + 10 * 60 * 1000);

        if (curTime < after30mins) {

            for (const absentee of newUniqueMissing) {
                console.log('information of absentee before it access to the notifyAbsence function ')
                console.dir(absentee)


                await notifyAbsence(
                    absentee,
                    startTime,
                    thread,
                    JSONwithTS,
                    absenceKeyTutor,
                    absenceKeyStudent,
                    absenceKeyBot
                );

            }
        }
        await sleep(interval);
        return log;

    }



    async leaveSession(meetLink) {

        const page = this.page;

        await page.close();

        console.log(`tab closed! - ${meetLink} `);

        await sleep(1000);

    }



    async isInMeet() {

        const page = this.page;

        const element = await page.$('[class="P245vb"]');

        if (element) {

            return true;

        } else {

            return false;

        }

    }

}


// function findDifferences(str1, str2) {
//     // Split both strings into lines
//     const lines1 = str1.split('\n');
//     const lines2 = str2.split('\n');

//     // Find and return the differences between the two arrays of lines
//     return lines1.filter((line, index) => line !== lines2[index]);
// }

async function removeAMorPM(message) {
    const match = message.match(/(AM|PM)(\s[\s\S]*)/);

    let text;

    if (match) {
        text = match[2].trim(); // This will contain the part after "PM" or "AM"
    } else {
        text = message
    }

    return text
}


async function monitorMeet(browser, event) {

    let eventID = event.id;
    let attendanceLog = "";
    let fileName = `Record_${eventID}`


    await writeJSONFile(fileName)


    const startTime = event.startTime.getTime();

    const endTime = event.endTime.getTime();



    // create new window with new tab

    const bot = await AttendanceBot.initialize(browser);

    try {

        // find or create Slack thread

        const thread = await getThread(event.title, event.startTime, event.endTime);



        // join session

        await bot.joinSession(event.title, event.meetLink, thread);

        bot.postContactGuest(thread, event.guests)

        await sleep(1000);

        // auto admit AND take attendance

        await pAll([

            async () => {

                while (Date.now() < endTime) {

                    if (await bot.isInMeet() === true) {

                        await bot.autoAdmit(5 * 1000);

                    } else {

                        sendMessage(thread, "Removed from session 😭")

                        throw Error("bot removed :(");

                    }

                }

            },

            async () => {



                console.log("taking attendance...");


                while (Date.now() < Math.min(endTime - (10 * 60 * 1000), endTime)) {

                    if (await bot.isInMeet() === true) {

                        let guestListForAttandace = event.guests.slice();
                        guestListForAttandace.push({
                            email: 'bot@noemail.com',
                            responseStatus: 'needsAction'
                        });

                        //console.log(guestListForAttandace)

                        await bot.takeAttendance(
                            thread,
                            1 * 60 * 1000,
                            guestListForAttandace,
                            event.startTime,
                            fileName
                        ); // CHANGE WHEN TESTING

                    } else {

                        throw Error("bot removed :(");

                    }

                }

            },

        ]);



        // wait until end of session plus 5 minutes

        const untilEnd = event.endTime - Date.now();

        await sleep(untilEnd + (5 * 60 * 1000)); // SAFE TO COMMENT OUT WHEN TESTING

    } catch (e) {

        console.log(e);

    } finally {

        // leave session and close tab

        await bot.leaveSession(event.meetLink);

        console.log(`closing context...${event.meetLink} `);

        // deleteFile(absenceTxt)
        // deleteFile(attendaceTxt)
        deleteJSONFile(fileName)

        await bot.context.close();

        return attendanceLog;

    }

}

async function getEventData(timeMin, timeMax) {

    var calendarListRes = await calendar.calendarList.list({ maxResults: 250 });

    var calendarList = calendarListRes.data.items;

    while (calendarListRes.data.nextPageToken != null) {

        calendarListRes = await calendar.calendarList.list({ maxResults: 250, pageToken: calendarListRes.data.nextPageToken });

        calendarList = calendarList.concat(calendarListRes.data.items);

    }

    const calendarEvents = [];

    const events = [];

    for (const calendarItem of calendarList) {

        const calendarId = calendarItem.id;

        const eventListRes = await calendar.events.list({

            calendarId,

            timeMin,

            timeMax,

            singleEvents: true,

            orderBy: 'startTime',

        });

        var eventList = [];

        eventList = eventListRes.data.items;

        for (const event of eventList) {

            calendarEvents.push(event);

        }

    }

    console.log(`Retrieved ${calendarEvents.length} events from ${calendarList.length} calendars.`);



    for (const calendarEvent of calendarEvents) {

        var monitoringInvited = false;

        const attendeeList = calendarEvent.attendees; //Gets the guest list 

        if (attendeeList == null) { //Skip event if there are no attendees

            continue;

        }

        for (const attendee of attendeeList) {

            if (attendee.email == MONITORING_EMAIL) { //Check if guest email is monitoring

                monitoringInvited = true;

                break;

            }

        }

        if (!monitoringInvited || calendarEvent.summary.match(CANCELLED_REGEX) != null) { //Check if monitoring invited and if event is not cancelled

            continue;

        }

        const event = new Event(

            calendarEvent.summary,

            new Date(calendarEvent.start.dateTime),

            new Date(calendarEvent.end.dateTime),

            calendarEvent.hangoutLink,

            attendeeList,

            calendarEvent.id


        );

        events.push(event);

    }

    return events;

}


// HELPERS

/** 

 * saves cookies from the current execution so login credentials can be 

 * remembered between runs without hardcoding passwords

 * @param {Promise} page the current page object that cookies will be saved for

 * @returns {void}

 */

async function saveCookies(page, filePath) {

    const cookies = await page.cookies();

    await fs.writeFile(filePath, JSON.stringify(cookies, null, 2));

}



async function loadCookies(filePath) {

    const cookiesData = await fs.readFile(filePath);

    return JSON.parse(cookiesData);

}



function areCookiesValid(cookies) {

    // check if the cookies array is empty

    if (cookies.length === 0) {

        return false;

    }

    // checks if any cookie is expired

    const currentTimestamp = Date.now() / 1000;

    for (const cookie of cookies) {

        if (cookie.expires < currentTimestamp) {

            return false;

        }

    }

    return true;

}



async function requestLogin() {

    let loginInfo = [];

    const schema = {

        properties: {

            gmail: {

                description: 'please enter your Gmail username ',

                pattern: /^[a-z0-9](\.?[a-z0-9]){5,}@([\w-]*)\.com$/,

                message: 'Gmail username must end in @[domain].com',

                required: true

            },

            pass: {

                description: 'please enter your Gmail password (not saved) ',

                hidden: true

            }

        }

    };



    if (process.env.GMAIL === "" || process.env.PASSWORD === "") {

        // start the prompt

        prompt.start();



        // get login credentials from user, not hardcoded in .env file

        loginInfo = await prompt.get(schema);

        console.log('login credentials received...');

        await sleep(3000);



        // this does not save user input to the .env file, it is only stored for the current execution

        if (loginInfo != undefined) {

            process.env.GMAIL = loginInfo.gmail;

            process.env.PASSWORD = loginInfo.pass;

        }

    }

}



/** 

 * sleep function 

 * @param {int} milliseconds the number of milliseconds the script will pause for

 * @returns {Promise} the response of setTimeout

 */

function sleep(milliseconds) {

    return new Promise((r) => setTimeout(r, milliseconds));

}


// Takes list of displayed guests and list of invited emails; 
//returns list of Absentees and the present users with their database information

async function getGuestUsers(invitees) {
    let guestUsers = [];

    const PEOPLEDATABASE = await getGoogleSheetsData(spreadsheetId, ALLTABNAME);

    for (const invite of invitees) {
        if (invite.email == OPERATION_EMAIL || invite.email == MONITORING_EMAIL) {
            continue; // Skip checking monitoring email
        }

        let invitedName;
        let invitedNickName;
        let role;
        let guestEmail = invite.email;

        if (guestEmail == 'bot@noemail.com') {
            invitedName = firefliesAccount;
            invitedNickName = 'Fireflies.ai Notetaker';
            role = 'bot';
            guestUsers.push({ name: invitedName, nickname: invitedNickName, role: role, email: guestEmail });

        } else {
            let peopleData = getPersonFromData(PEOPLEDATABASE, guestEmail, EMAIL_COLUMN);
            for (let personData of peopleData) {
                if (personData) {
                    invitedName = personData[NAME_COLUMN - 1] || 'No name';
                    invitedNickName = personData[NICKNAME_COLUMN - 1] || 'No nickname';
                    role = personData[ROLE_COLUMN - 1] || 'No role';

                } else {
                    // Convert email to string to prevent Slack mailto link
                    invitedName = `<mailto:${guestEmail}|${guestEmail}>`;
                    invitedNickName = 'Not in DB';
                    role = 'Not in DB';
                }
                if (invitedName != undefined) {
                    guestUsers.push({ name: invitedName, nickname: invitedNickName, role: role, email: guestEmail });
                }
            }

        }



    }

    console.log('guestUsers List')
    console.dir(guestUsers)

    return guestUsers;
}




function getPresentUsers(guestUsers, displayList) {
    let present = [];

    guestUsers.forEach((guestUser) => {
        const nameToSearchInvated = guestUser.name.toLowerCase();
        const nicknameToSearchInvated = guestUser.nickname ? guestUser.nickname.toLowerCase() : null;

        const foundDisplayUser = displayList.find(
            (displayUser) =>
                displayUser.name.toLowerCase() == nameToSearchInvated ||
                (nicknameToSearchInvated && displayUser.name.toLowerCase() == nicknameToSearchInvated)
        );

        if (foundDisplayUser) {
            present.push({
                name: guestUser.name,
                nickname: guestUser.nickname,
                role: guestUser.role || 'Not found in DB', // Set role as "Not found in DB" if not present
            });
        }
    });

    // Add users from displayList that are not in guestUsers
    displayList.forEach((displayUser) => {
        const nameToSearch = displayUser.name.toLowerCase();
        const nicknameToSearch = displayUser.nickname ? displayUser.nickname.toLowerCase() : null;

        const isUserAlreadyAdded = present.some(
            (addedUser) =>
                addedUser.name.toLowerCase() == nameToSearch ||
                (nicknameToSearch && addedUser.name.toLowerCase() == nicknameToSearch)
        );

        if (!isUserAlreadyAdded) {
            if (displayUser.name == 'ModernSmart Operation') { return }
            else if (displayUser == 'Fireflies.ai Notetaker') {
                present.push({
                    name: firefliesAccount,
                    role: 'Bot',
                });

            }
        }
    });

    return present;
}



function getMissingUsers(guestUsers, displayList, validNicknames = []) {
    let missing = [];
    const displayMap = new Map(displayList.map((guest) => [guest.name.toLowerCase(), guest]));

    guestUsers.forEach((guestUser) => {
        if (guestUser && guestUser.name) {
            const nameToSearch = guestUser.name.toLowerCase();
            const nicknameToSearch = guestUser.nickname.toLowerCase();
            const foundGuest = displayMap.get(nameToSearch) || displayMap.get(nicknameToSearch);

            // Check if display name matches the conditions
            const isDisplayNameMatch = (guest) => {
                return validNicknames.includes(guest.nickname.toLowerCase());
            };

            // Check if the entry should be added to the missing array
            if (!foundGuest && !isDisplayNameMatch(guestUser)) {
                const key = `${nameToSearch}-${nicknameToSearch}`;
                
                // Keep only one entry for each unique combination of name and nickname
                if (!displayMap.get(nameToSearch) && !displayMap.get(nicknameToSearch)) {
                    const matchingGuests = missing.filter((missingGuest) => {
                        const missingKey = `${missingGuest.name.toLowerCase()}-${missingGuest.nickname.toLowerCase()}`;
                        return missingKey === key;
                    });

                    if (matchingGuests.length === 0) {
                        missing.push(guestUser);
                    } else {
                        // Remove objects with the same name from missing
                        missing = missing.filter((missingGuest) => {
                            const missingKey = `${missingGuest.name.toLowerCase()}-${missingGuest.nickname.toLowerCase()}`;
                            return missingKey !== key;
                        });
                    }
                }
            }
        }
    });

    return missing;
}


async function createListGuest(guestDisplayList, guestList) {
    console.log('Display user');
    let display = guestDisplayList;
    console.dir(display);
    console.log('Guest user');
    let invitees = guestList;
    console.dir(invitees);

    const guestUsers = await getGuestUsers(invitees);

    console.log('guestUsers after searching on the database');
    console.dir(guestUsers);

    const present = getPresentUsers(guestUsers, display);
    const missing = getMissingUsers(guestUsers, display);

    present.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    missing.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    // Create a map to track unique names and nicknames
    const uniqueNamesAndNicknames = new Map();

    // Filter duplicates in present
    const uniquePresent = present.filter((value) => {
        const key = value.name.toLowerCase();
        if (!uniqueNamesAndNicknames.has(key)) {
            uniqueNamesAndNicknames.set(key, true);
            return true;
        }
        return false;
    });

    // Clear the map for re-use
    uniqueNamesAndNicknames.clear();

    // Filter duplicates in missing
    const uniqueMissing = missing.filter((value) => {
        const key = value.name.toLowerCase();
        if (!uniqueNamesAndNicknames.has(key)) {
            uniqueNamesAndNicknames.set(key, true);
            return true;
        }
        return false;
    });



    console.log('present:');
    console.dir(uniquePresent);
    console.log('missing:');
    console.dir(uniqueMissing);

    return { uniquePresent, uniqueMissing };
}

// Called on each meeting every 1 minutes for the first ~20 minutes

async function createLog(guests, absentees) {
    let log = "";

    console.log('createLog guest ')

    console.dir(guests)
    console.log('createLog absenttes')
    console.dir(absentees)

    log += (new Date()).toLocaleTimeString('en-US');

    // Log present guests
    if (guests && guests.length != 0) {
        log += "\nPresent:\n";
        for (const guest of guests) {
            console.dir(guest);
            log += `∙ ${guest.name} :white_check_mark: ${capitalizeFirstLetter(guest.role)} \n`;
        }
    }

    // Log absentees
    if (absentees && absentees.length != 0) {
        let logabs = "";
        for (const absentee of absentees) {
            if (absentee.role != "parent") { // Exclude the parents since the contact information will be posted at the beginning
                logabs += `∙ ${absentee.name} :x: ${capitalizeFirstLetter(absentee.role)}\n`;
            }
        }

        if (logabs.trim() != '') {
            log += `\nAbsent: \n${logabs}`;
        }
    }
    console.dir(log)
    return log;
}



async function notifyAbsence(absentee, meetingTime, thread, JSONwithTS, keyTutor, keyStudent, keyBot) {
    try {
        let titleAbsenceRecord = JSONwithTS;
        const curTime = new Date();
        const lateAmount = curTime - meetingTime;
        const role = absentee.role;
        //const name = absentee.name;
        const newMeetingTime = new Date(meetingTime)
        const after4mins = new Date(newMeetingTime.getTime() + (4 * 60 + 40) * 1000);
        const after6mins = new Date(newMeetingTime.getTime() + (5 * 60 + 40) * 1000);
        const after7mins = new Date(newMeetingTime.getTime() + (7 * 60 + 40) * 1000);
        const after9mins = new Date(newMeetingTime.getTime() + (8 * 60 + 40) * 1000);
        let lateThreshold;
        let keyTS;

        console.dir(absentee)

        if (role == "student") {
            lateThreshold = STUDENTTIME;
            keyTS = keyStudent
        }

        else if (role == "tutor") {
            lateThreshold = TUTORTIME;
            keyTS = keyTutor
        }

        else if (role == "bot") {
            lateThreshold = BOTTIME;
            keyTS = keyBot;
        }
        else {
            return [];
        }

        console.log('lateAmount:', lateAmount)
        console.log('lateThreshold:', lateThreshold)
        let notificationLog = [];

        if (lateAmount > lateThreshold) { // Person is absent past the allowed time amount
            console.log(titleAbsenceRecord);

            if (absentee.groups) {
                let groupedUsers = absentee.groups;
                groupedUsers.forEach(userAbsent => {
                    let userNAmeGroup = `:bangbang: ${userAbsent.name} is absent.\n`
                    notificationLog.push(userNAmeGroup)
                });
            } else {

                notificationLog = `:bangbang: ${absentee.name} is absent.\n `;

            }

            let contentAbsent = `${curTime.toLocaleTimeString('en-US')}\n${notificationLog.join('\n')}\n<@U05M0P95AGZ>`;
            let replyAbsentID = await readJSONValue(titleAbsenceRecord, keyTS);
            let currentabsentMessage;

            if (replyAbsentID != "0") {
                currentabsentMessage = await getMessageByTsAndChannel(UAT_CHANNEL_ID, replyAbsentID);
            } else {
                currentabsentMessage = 'PM';
            }

            let recordAbsent1 = await removeAMorPM(contentAbsent);

            if (
                (role === "tutor" && (after4mins < curTime && curTime < after6mins || after7mins < curTime && curTime < after9mins)) ||
                (role === "student" && after7mins < curTime && curTime < after9mins)
            ) {
                recordAbsent1 = '';
            }




            let recordAbsent2 = await removeAMorPM(currentabsentMessage);

            if (recordAbsent1 !== recordAbsent2) {
                await sendMessagewithrecord(thread, contentAbsent, keyTS, titleAbsenceRecord);
            } else {
                // The string representations are the same, so no need to send a message.
                console.log("There is no change in the attendance.");
            }

            return [absentee.email]; // Mark this absentee as late, so that they are only notified once.
        }



        return [];
    } catch (error) {
        console.error("Error in notifyAbsence:", error);
        return [];
    }
}



async function sendEmail(email, title, body) {

    const options = {

        to: email,

        // cc: "",

        subject: title,

        text: body,

        textEncoding: 'base64',

    };



    const messageId = await sendMail(options);

    return messageId;

}


// Helper functions for sendEmail

async function createMail(options) {

    const mailComposer = new MailComposer(options);

    const message = await mailComposer.compile().build();

    return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

}



async function sendMail(options) {

    const rawMessage = await createMail(options);

    const { data: { id } = {} } = await gmail.users.messages.send({

        userId: 'me',

        resource: {

            raw: rawMessage,

        },

    });

    return id;

}



//Given two names (display name and name from database), assess if they are equal

function matchNames(displayName, databaseName) {

    const charRegex = /[^a-zA-Z]/g;

    var name1 = displayName.toLowerCase().trim(); //Ignore casing and leading/trailing whitespace

    var name2 = databaseName.toLowerCase().trim();

    // Reduce name to only characters, then sort to compare anagrams, which accounts for rearranged first/last/middle names

    var name1chars = name1.replace(charRegex, '').split("").sort().join("");

    var name2chars = name2.replace(charRegex, '').split("").sort().join("");

    if (name1chars == name2chars) { return true; }

    var name1words = name1.split(" ");

    var name2words = name2.split(" ");

    if (name1words[0] == name2words[0]) { return true; } // Return true if first names match

    if (name1words[name1words.length - 1] == name2words[name2words.length - 1]) { return true; } // Return true if last names match

    return false;

}



// Gets data from a Google Sheets tab (assuming credentials allow for access)

// Input: (String, String); ID of Google Sheets, name of tab in the sheet

// Output: (Array[String[]]): Ordered array of all rows in the tab

async function getGoogleSheetsData(spreadsheetId, tabName) {

    let response = "";

    try {

        const auth = new google.auth.GoogleAuth({

            keyFile: "database_credentials.json",

            scopes: SCOPES

        });

        const authObject = await auth.getClient();

        const sheetsAPI = google.sheets({ version: "v4", auth: authObject });

        //Get the data 

        response = await sheetsAPI.spreadsheets.values.get({

            auth,

            spreadsheetId,

            range: `${tabName}!A2:ZZ`, // Get all rows except the first (column names)

        });

    }

    catch (e) { console.log(e); }

    if (response.data) {

        console.log(`Loaded ${response.data.values.length} rows from Google Sheets.`)

    }

    else {

        console.log("ERROR loading Google Sheets data.")

        return []; //Return empty array if there is no data

    }

    return response.data.values;

}

// Given an identifier, searches the database and returns their data

// Input: (Array[String[]], String, Integer); Database, Identifier, column number of identifier (starts at 1)

// Output: (String[]); The row of data matching the identifier

function getPersonFromData(database, identifier, columnNum) {
    const matchingRows = [];

    for (let i = 0; i < database.length; i++) {
        const row = database[i];

        if (
            row[columnNum - 1]?.toLowerCase().includes(identifier.toLowerCase()) &&
            row[ROLE_COLUMN - 1]?.toLowerCase() !== 'staff' &&
            row[ROLE_COLUMN - 1]?.toLowerCase() !== 'partner'
        ) {
            // Found a matching row
            matchingRows.push(row); // Push the rowData array directly
        }
    }

    return matchingRows;
}



async function getThread(title, startTime, endTime) {

    let startString = startTime.toLocaleTimeString("en-US");

    let endString = endTime.toLocaleTimeString("en-US");

    let date = startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    startString = (startString.match(DATE_REGEX))[1] + (startString.match(DATE_REGEX))[2].toLowerCase();

    endString = (endString.match(DATE_REGEX))[1] + (endString.match(DATE_REGEX))[2].toLowerCase();

    const text = `${title} ${date}⋅${startString} - ${endString}`

    // console.log(title, date, startString, endString)

    try {

        const thread = await findMessage(UAT_CHANNEL_ID, [title, date, startString, endString]);

        console.log("existing thread found!");

        return thread;

    } catch (e) {

        console.log(e)

        console.log("creating new thread.");

        const thread = await publishMessage(UAT_CHANNEL_ID, text);

        return thread;

    }

}



function sendMessage(thread, message) {

    mutex.runExclusive(async () => {

        try {

            await replyMessage(UAT_CHANNEL_ID, thread.ts, message);

            console.log("message sent!");

        } catch (e) {

            console.log(e);

        }

    });

}

function sendMessagewithrecord(thread, message, keyValue, nameRecord) {

    let title = nameRecord;
    let keyTSValue = keyValue;

    mutex.runExclusive(async () => {

        try {

            await replyMessagewithrecord(UAT_CHANNEL_ID, thread.ts, message, keyTSValue, title);

            console.log("message sent!");

        } catch (e) {

            console.log(e);

        }

    });

}



async function createBrowser() {

    // create browser dummy

    const option = {

        revision: "",

        detectionPath: "",

        folderName: ".chromium-browser-snapshots",

        defaultHosts: ["https://storage.googleapis.com", "https://npm.taobao.org/mirrors"],

        hosts: [],

        cacheRevisions: 2,

        retry: 3,

        silent: false

    };

    const stats = await PCR(option);



    puppeteerExtra.use(stealthPlugin());

    const browser = await puppeteerExtra.launch({

        headless: false, // set to false when testing

        executablePath: stats.executablePath,

        args: [

            '--no-sandbox',

            '--use-fake-ui-for-media-stream', //https://stackoverflow.com/questions/48264537/auto-allow-webcam-access-using-puppeteer-for-node-js

        ]

    });

    return browser;

}



async function authorize() {

    const credentials = require(CLIENT_SECRET_PATH);



    const oAuth2Client = new google.auth.OAuth2(

        credentials.installed.client_id,

        credentials.installed.client_secret,

        credentials.installed.redirect_uris[0]

    );



    try {

        const token = require(`./${TOKEN_PATH}`);

        oAuth2Client.setCredentials(token);

        return oAuth2Client;

    } catch (err) {

        console.log("Token missing or incorrect.")

    }

}

// Function to create a JSON file, with the event ID as title

async function writeJSONFile(fileName) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const jsonFilePath = path.join(__dirname, 'record', `${fileName}.json`);
    const data = {
        absenceTs: "0",
        attendaceTuTorTs: "0",
        attendaceStudentTs: "0",
        attendaceBotTs: "0"
    };

    const jsonData = JSON.stringify(data, null, 2);
    console.log("File created")

    try {
        await fs.writeFile(jsonFilePath, jsonData, 'utf8');
        console.log('JSON file created');
    } catch (error) {
        console.error(error);
    }
}

// Function to write in the JSON and update the keyvalue we need 
// It will write the ts of the last post in Slack
function updateTsValue(fileName, key, newTS) {
    try {
        const jsonFilePath = `./Record/${fileName}.json`;
        const jsonData = require(jsonFilePath);

        // Update the specified key with the new value
        jsonData[key] = newTS;

        // Write the updated JSON back to the file
        const fs = require('fs');
        fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf8');
        console.log(`Updated "${key}" in "${fileName}.json"`);
    } catch (error) {
        console.error('Error updating JSON file:', error);
    }
}


// Function to write in the JSON file with the even name as title
// It will write the ts of the last post in Slack

async function readJSONValue(fileName, key) {
    try {
        const jsonData = require(`./Record/${fileName}.json`);
        return jsonData[key];
    } catch (error) {
        console.error('Error reading JSON file:', error);
    }
}

// function to delete the JSON record when the meets end

async function deleteJSONFile(fileName) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const jsonFilePath = path.join(__dirname, 'record', `${fileName}.json`);

    try {
        await fs.unlink(jsonFilePath);
        console.log('JSON file deleted successfully');
    } catch (error) {
        console.error(error);
    }
}



// // Function to create a TXT file with the event ID as title 
// async function createEmptyTextFile(fileName) {
//     try {
//         const __dirname = path.dirname(fileURLToPath(import.meta.url));
//         // Specify the directory path where the file should be created
//         const directoryPath = path.join(__dirname, 'record');
//         // Specify the file path
//         const filePath = path.join(directoryPath, `${fileName}.txt`);

//         // Create the empty file
//         await fs.writeFile(filePath, '', 'utf8');
//     } catch (err) {
//         console.error(`Error creating the file: ${err}`);
//     }
// }





// // Function to write in the TXT file with the even name as title
// It will write the ts of the last post in Slack
// async function writeTextToFile(txtFileName, content) {
//     try {
//         await fs.writeFile(`./Record/${txtFileName}.txt`, content, 'utf8');
//     } catch (err) {
//         console.error(`Error writing to the file: ${err}`);
//     }
// }


// function to read the information in the TXT to get the TS in the content
// it will retun the content so we can use it to read the history of the Slack post
// async function readTextFile(txtFileName) {
//     try {
//         const content = await fs.readFile(`./Record/${txtFileName}.txt`, 'utf8');
//         return content;
//     } catch (err) {
//         console.error(`Error reading the file: ${err}`);
//         return null;
//     }
// }

// function to delete the TXT record when the meets end

// async function deleteFile(txtFileName) {
//     try {
//         // Check if the file exists
//         await fs.access(`./Record/${txtFileName}.txt`);

//         // Delete the file
//         await fs.unlink(`./Record/${txtFileName}.txt`);
//         console.log(`File "${txtFileName}" has been deleted.`);
//     } catch (error) {
//         console.error(`Error deleting file "${txtFileName}": ${error.message}`);
//     }
// }


function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


export async function main() {

    // asks for login info if .env is not populated

    await requestLogin();

    // creates browser instance used by contexts

    const browser = await createBrowser();




    // interval in which event data is being gathered

    const interval = 1 * 60 * 60 * 1000; // 1 hour

    const startRange = Date.now() + (1 * 1000);

    // change to desired end date

    const endRange = (new Date("1/01/2025, 12:00:00 AM")).getTime();



    // creates triggers for when events are pulled from monitoring calendar

    const execTriggers = [];

    let timeMin = startRange;

    let timeMax = Math.min(timeMin + interval - 1, endRange - 1);



    while (timeMax < endRange) {

        const minDate = new Date(timeMin);

        const maxDate = new Date(timeMax);

        execTriggers.push(() => {
            schedule.scheduleJob(minDate, async () => {

                // gets events from calendar

                const events = await getEventData(minDate, maxDate); // COMMENT OUT WHEN USING LOCAL TEST CASES

                console.log(minDate.toLocaleString('en-US'), maxDate.toLocaleString('en-US'));



                // creates triggers for each session to be monitored

                const botTriggers = [];

                const size = events.length;

                for (let i = 0; i < size; i++) {

                    const startTime = events[i].startTime;

                    if (startTime > minDate && startTime < maxDate) {

                        console.log(events[i].title);

                        // execute trigger 5 minutes before session start time OR immediately (greater of the two)

                        const timeBefore = Math.max(startTime.getTime() - (5 * 60 * 1000), Date.now() + (1 * 1000));

                        const dateBefore = new Date(timeBefore);



                        botTriggers.push(() => {
                            schedule.scheduleJob(dateBefore, async () => {

                                const attendanceLog = await monitorMeet(

                                    browser,

                                    events[i],

                                );

                            })
                        });

                    }

                }

                console.log(botTriggers.length);

                try {

                    await pAll(botTriggers, { stopOnError: false });

                } catch (e) {

                    console.log(e);

                }

            })
        });

        timeMin = timeMax + 1;

        timeMax = Math.min(timeMin + interval - 1, endRange);

    }

    console.log(execTriggers.length);

    try {

        await pAll(execTriggers, { stopOnError: false });

    } catch (e) {

        console.log(e);

    }

}

export { updateTsValue }

main();
