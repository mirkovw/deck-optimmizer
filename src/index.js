// app.js
const app = require('express')();
express = require('express');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const util = require("util");
const fs = require("fs-extra");
const sizeOf = util.promisify(require('image-size'))

const GoogleSlidesOptimizer = require("./util/GoogleSlidesImageOptimizer");
const getCredentials = require("./util/getCredentials");
const downloadImageToDisk = require("./util/downloadImageToDisk");
const formatSizeUnits = require("./util/formatSizeUnits");
const optimizeGif = require("./util/optimizeGif");
const checkIfGif = require("./util/checkIfGif");
const cropGif = require("./util/cropGif");

const port = process.env.PORT || 3000;
const log_stdout = process.stdout;

const toHref = (url, label) => '<a target="_blank" href="' + url + '">' + (label || url) + '</a>';

console.log = function (d, socket) {
    log_stdout.write(util.format(d) + '\n');
    if (socket) socket.emit('update message', {data: d});
};

(async () => {
    http.listen(port, () => {
        console.log(`Deck Optimmizer - Server running at http://localhost:${port}/`);
    });
})();


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

console.log(__dirname)
app.use(express.static(__dirname + '/public'));
app.use('/gif', express.static('./gif'));

io.on('connection', async (socket) => {
    socket.on('processDeck', async msg => {
        try {
            const presentation = await processDeck(msg, socket);
        } catch (e) {
            console.log(e)
        }
    });

    socket.on('applyOptimizeSettings', async msg => {
        const sourceImagePath = './gif/source/' + msg.gifId + '.gif';
        const outputImagePath = './gif/output/' + msg.gifId + '_optimized.gif';
<<<<<<< HEAD

        //optimize gif and remove source image after its done
        let gif = await optimizeGif(sourceImagePath, outputImagePath, msg.applyLossy, msg.factor, msg.applyColourCorrect, msg.colourRange);

        try {
            await fs.copyFile(outputImagePath, './src/public/gif/' + msg.gifId + '_optimized.gif');
            if (msg.auto == false) {
                if (socket) socket.emit('replaceGif', { 'output': './gif/' + msg.gifId + '_optimized.gif' });
            }
        } catch (e) { };
=======
        const sourceUrl = msg.src;

        // download image
        await downloadImageToDisk(sourceUrl, sourceImagePath);

        //optimize gif and remove source image after its done
        await optimizeGif(sourceImagePath, outputImagePath, msg.applyLossy, msg.factor, msg.applyColourCorrect, msg.colourRange);

        await fs.copyFile(outputImagePath, './src/public/gif/' + msg.gifId + '_optimized.gif');

        if (msg.auto == false) {
            if (socket) socket.emit('replaceGif', {'output': './gif/' + msg.gifId + '_optimized.gif'});
        }
>>>>>>> adds optimized updateCopyDeck
        socket.emit('optimizationCompleted', 'completed');
    });

    socket.on('deleteGifs', async msg => {
        let gifs = msg.gifIds;
        for (let id in gifs) {
            try {
                if (fs.existsSync('./gif/source/' + gifs[id] + '.gif')) {
                    await fs.unlinkSync('./gif/source/' + gifs[id] + '.gif');
                }
                if (fs.existsSync('./gif/output/' + gifs[id] + '_optimized.gif')) {
                    await fs.unlinkSync('./gif/output/' + gifs[id] + '_optimized.gif');
                }
                if (fs.existsSync('public/gif/' + gifs[id] + '_optimized.gif')) {
                    await fs.unlinkSync('public/gif/' + gifs[id] + '_optimized.gif');
                }
            } catch (e) {
            }
        }
    });

    socket.on('updateCopyDeck', async msg => {
        // get credentials, create if they don't exist
        const credentials = await getCredentials('./creds.json');

        // create new instance of class
        const slidesOptimizer = new GoogleSlidesOptimizer(credentials);

        //get original slides data
        const presentationId = msg.deckid;

        console.log('Presentation id:' + presentationId);

        // get all slides data
        const slidesData = await slidesOptimizer.getSlides(presentationId);

        // fish out all the images in slides data
        const imageElements = await slidesOptimizer.getImageElements(slidesData);

        let gifElements = [];
        let checkIfGifPromiseArray = [];

        for (const [imageElement] of imageElements.entries()) {
            checkIfGifPromiseArray.push(new Promise(async (resolve) => {
                let isGif = await checkIfGif(imageElements[imageElement].image.contentUrl);
                if (isGif) {
                    gifElements.push(imageElements[imageElement]);
                }
                resolve();
            }))
<<<<<<< HEAD
    }
    await Promise.all(checkIfGifPromiseArray);
    
    optimizedGifs = fs.readdirSync("./src/public/gif/");
    let optimizeGifPromiseArray = [];
    let totalSourceSize = 0, outputSize = 0;
    for (var [index, element] of gifElements.entries()) {
        optimizeGifPromiseArray.push(new Promise(async (resolve) => {
            sourceImageId = element.objectId;
            match = optimizedGifs.some(e => e.includes(sourceImageId));
            if (match) {
                sourceImagePath = './gif/source/' + element.objectId + '.gif';
                outputImagePath = './gif/output/' + element.objectId + '_optimized.gif';
                sourceSize = fs.statSync(sourceImagePath).size;
            } else {
                sourceImagePath = './gif/source/' + element.objectId + '.gif';
                outputImagePath = './gif/output/' + element.objectId + '.gif';
                sourceSize = fs.statSync(sourceImagePath).size;
                let copy = await fs.copyFile(sourceImagePath, outputImagePath);
                outputImageStats = fs.statSync(outputImagePath);
            }

            totalSourceSize += sourceSize

            // Display source preview
            sourceUrl = element.image.contentUrl;

            //log current filesize
            sourceImageStats = fs.statSync(sourceImagePath);

            //check image dimensions
            imgDimensions = await sizeOf(sourceImagePath);
            imgWidth = imgDimensions.width;
            imgHeight = imgDimensions.height;

            // set "trueScale", name I came up with for the actual scale when a image is 1:1 pixels in fullscreen presenting mode
            const trueScaleX = 190.5; // 381/2 and 381x25 = 9525
            const trueScaleY = 190.5;

            // determine what resolution the image is actually rendered at in the slide
            let renderedImgWidth = ((element.size.width.magnitude / 25) * element.transform.scaleX) / trueScaleX;
            let renderedImgHeight = ((element.size.height.magnitude / 25) * element.transform.scaleY) / trueScaleY;

            // declare resize/crop string to pass in the optimizeGif function
            let resizeLine = '';
            let cropLine = '';

            // //determine if resizing of the image is required (when a image is placed at 0.95 scale or lower)
            if (renderedImgWidth / imgWidth < 0.95 || renderedImgHeight / imgHeight < 0.95) {
                resizeLine = Math.round(renderedImgWidth) + 'x' + Math.round(renderedImgHeight);
            }

            if (element.image.imageProperties.hasOwnProperty('cropProperties')) {
                const cropProps = {
                    leftOffset: 0, rightOffset: 0, topOffset: 0, bottomOffset: 0, // make sure all required props are in the object
                    ...element.image.imageProperties.cropProperties // overwrite if necessary with props from google's object
                };

                // construct the cropLine to pass in the optimizeGif function
                cropX1 = Math.round(cropProps.leftOffset * imgWidth);
                cropY1 = Math.round(cropProps.topOffset * imgHeight);
                cropX2 = Math.round(imgWidth - (cropProps.rightOffset * imgWidth));
                cropY2 = Math.round(imgHeight - (cropProps.bottomOffset * imgHeight));

=======
        }

        await Promise.all(checkIfGifPromiseArray);

        let optimizedGifs = fs.readdirSync("./src/public/gif/");

        let totalSourceSize = 0, outputSize = 0;

        // add everything into array of functions to run with limited concurrency
        const pLimit = await import('p-limit'); // using this ESM package to limit concurrency of promises
        const limit = pLimit.default(50); // set limit to 100 promises at a time
        // const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        // progressBar.start(gifElements.length, 0); // start a new progress bar

        const doEveryThing = async (element, index) => {

            let sourceImageId = element.objectId;
            let sourceSize, sourceImagePath, outputImagePath, outputImageStats;

            // Check if
            let match = optimizedGifs.some(e => e.includes(sourceImageId));

            if (match) {
                sourceImagePath = './gif/source/' + element.objectId + '.gif';
                outputImagePath = './gif/output/' + element.objectId + '_optimized.gif';
                sourceSize = fs.statSync(sourceImagePath).size;
            } else {
                sourceImagePath = './gif/source/' + element.objectId + '.gif';
                outputImagePath = './gif/output/' + element.objectId + '.gif';
                sourceSize = fs.statSync(sourceImagePath).size;
                // download image
                await fs.copyFile(sourceImagePath, outputImagePath);
                outputImageStats = fs.statSync(outputImagePath);
            }

            totalSourceSize += sourceSize

            // Display source preview
            // let sourceUrl = element.image.contentUrl;

            //log current filesize
            let sourceImageStats = fs.statSync(sourceImagePath);

            //check image dimensions
            let imgDimensions = await sizeOf(sourceImagePath);
            let imgWidth = imgDimensions.width;
            let imgHeight = imgDimensions.height;

            // set "trueScale", name I came up with for the actual scale when a image is 1:1 pixels in fullscreen presenting mode
            const trueScaleX = 190.5; // 381/2 and 381x25 = 9525
            const trueScaleY = 190.5;

            // determine what resolution the image is actually rendered at in the slide
            let renderedImgWidth = ((element.size.width.magnitude / 25) * element.transform.scaleX) / trueScaleX;
            let renderedImgHeight = ((element.size.height.magnitude / 25) * element.transform.scaleY) / trueScaleY;

            // declare resize/crop string to pass in the optimizeGif function
            let resizeLine = '';
            let cropLine = '';

            // //determine if resizing of the image is required (when a image is placed at 0.95 scale or lower)
            if (renderedImgWidth / imgWidth < 0.95 || renderedImgHeight / imgHeight < 0.95) {
                resizeLine = Math.round(renderedImgWidth) + 'x' + Math.round(renderedImgHeight);
            }

            if (element.image.imageProperties.hasOwnProperty('cropProperties')) {
                const cropProps = {
                    leftOffset: 0, rightOffset: 0, topOffset: 0, bottomOffset: 0, // make sure all required props are in the object
                    ...element.image.imageProperties.cropProperties // overwrite if necessary with props from google's object
                };

                // construct the cropLine to pass in the optimizeGif function
                let cropX1 = Math.round(cropProps.leftOffset * imgWidth);
                let cropY1 = Math.round(cropProps.topOffset * imgHeight);
                let cropX2 = Math.round(imgWidth - (cropProps.rightOffset * imgWidth));
                let cropY2 = Math.round(imgHeight - (cropProps.bottomOffset * imgHeight));

>>>>>>> adds optimized updateCopyDeck
                // Address negative crop coords
                if ((parseInt(cropX1) || parseInt(cropY1)) < 0) {
                    cropLine = ""
                } else {
                    cropLine = cropX1 + ',' + cropY1 + '-' + cropX2 + ',' + cropY2;
                }

                // additional check to see if resize is actually needed by calculating the full rendered image dimensions, without crop
<<<<<<< HEAD
                fullWidth = (renderedImgWidth / ((1 - (cropProps.leftOffset + cropProps.rightOffset)) * 100)) * 100;
                fullHeight = (renderedImgHeight / ((1 - (cropProps.topOffset + cropProps.bottomOffset)) * 100)) * 100;
=======
                let fullWidth = (renderedImgWidth / ((1 - (cropProps.leftOffset + cropProps.rightOffset)) * 100)) * 100;
                let fullHeight = (renderedImgHeight / ((1 - (cropProps.topOffset + cropProps.bottomOffset)) * 100)) * 100;
>>>>>>> adds optimized updateCopyDeck
                console.log('Rendered image dimensions without crop: ' + Math.round(fullWidth) + 'x' + Math.round(fullHeight))

                if ((fullWidth / imgWidth < 0.95 || fullHeight / imgHeight < 0.95) && (cropLine != "")) {
                    try {
                        if (match) {
                            await cropGif(outputImagePath, outputImagePath, cropLine, resizeLine);
                        } else {
                            await cropGif(sourceImagePath, outputImagePath, cropLine, resizeLine);
                        }
                    } catch (error) {
                        console.log('err: ' + error);
                    }
<<<<<<< HEAD
                }
            } else {
                try {
                    if (match) {
                        await cropGif(outputImagePath, outputImagePath, cropLine, resizeLine);
                    } else {
                        await cropGif(sourceImagePath, outputImagePath, cropLine, resizeLine);
                    }
                } catch (error) { }
=======
                }
            } else {
                try {
                    if (match) {
                        await cropGif(outputImagePath, outputImagePath, cropLine, resizeLine);
                    } else {
                        await cropGif(sourceImagePath, outputImagePath, cropLine, resizeLine);
                    }
                } catch (error) {
                }
>>>>>>> adds optimized updateCopyDeck
            }

            outputImageStats = fs.statSync(outputImagePath);

            //log optimized filesize
<<<<<<< HEAD
            optimizationPercentage = 100 - ((outputImageStats.size / sourceImageStats.size) * 100);
            outputSize += outputImageStats.size;
            uploadedGifUrl = await slidesOptimizer.uploadFileToS3(outputImagePath);

            //replace url in google slides
            try {
                // Dont replace negative optimizations
                if (Math.round(optimizationPercentage) > 1) {
                    await slidesOptimizer.replaceImageUrl(presentationId, sourceImageId, uploadedGifUrl);
                }
            } catch (error) {
                console.error(error);
            };
            try {
                await fs.unlinkSync(sourceImagePath);
                await fs.unlinkSync(outputImagePath);
                await fs.unlinkSync('./src/public/gif/' + element.objectId + '_optimized.gif');
            } catch (e) { };

            // Don't log negative compressions
            if (Math.round(optimizationPercentage) > 1) {
                console.log('#' + (index + 1) + ' of ' + gifElements.length + ', Input: ' + formatSizeUnits(sourceSize) + ', Output: ' + formatSizeUnits(outputImageStats.size) + ', Optimization: ' + Math.round(optimizationPercentage) + "%", socket);
            } else {
                console.log('#' + (index + 1) + ' of ' + gifElements.length + ', Input: ' + formatSizeUnits(sourceSize) + ', Output: ' + formatSizeUnits(sourceSize) + ', Optimization: 0%', socket);
            }
            resolve();
        }))
    } await Promise.all(optimizeGifPromiseArray);
=======
            let optimizationPercentage = 100 - ((outputImageStats.size / sourceImageStats.size) * 100);
            outputSize += outputImageStats.size;

            let uploadedGifUrl = await slidesOptimizer.uploadFileToS3(outputImagePath);

            //replace url in google slides
            try {
                await slidesOptimizer.replaceImageUrl(presentationId, sourceImageId, uploadedGifUrl);
            } catch (error) {
                console.error(error);
            }
>>>>>>> adds optimized updateCopyDeck

            try {
                await fs.unlinkSync(sourceImagePath);
                await fs.unlinkSync(outputImagePath);
                await fs.unlinkSync('./src/public/gif/' + element.objectId + '_optimized.gif');
            } catch (e) {
            }
            ;

            console.log('#' + (index + 1) + ' of ' + gifElements.length + ', Input: ' + formatSizeUnits(sourceSize) + ', Output: ' + formatSizeUnits(outputImageStats.size) + ', Optimization: ' + Math.round(optimizationPercentage) + "%", socket);
            //progressBar.increment(1);
        }

        const listOfPromises = gifElements.map((gifElement, index) => {
            return limit(() => doEveryThing(gifElement, index));
        })

        await Promise.all(listOfPromises);
        //progressBar.stop();


        // log that it's done
        console.log('Done. Total optimization: ' + formatSizeUnits(totalSourceSize - outputSize), socket);

        let tokenData = await slidesOptimizer.verifyToken(msg.token)
        let payload = tokenData.getPayload()

        let newName = "Optimized copy of " + slidesData.data.title.match(/\|(.*)\|/).pop();

        // give permissions to target user
        let ownership_res = await slidesOptimizer.changeOwnership(presentationId, payload['email'], newName);
        if (ownership_res != '200') {
            await slidesOptimizer.generateAccessToken();
            await slidesOptimizer.changeOwnership(presentationId, payload['email'], newName);
        }
        socket.emit("finishProcess", {'link': 'https://docs.google.com/presentation/d/' + presentationId});
        console.log("New Presentation URL:<br>" + toHref('https://docs.google.com/presentation/d/' + presentationId), socket)
    });
});

<<<<<<< HEAD
async function processDeck(msg, socket){        
    socket.emit('DisplayTxt', {txt: "Retrieving GIFs... Please Wait."});
    const credentials = await getCredentials('./creds.json');    
=======
async function processDeck(msg, socket) {
    socket.emit('DisplayTxt', "");
    const credentials = await getCredentials('./creds.json');
>>>>>>> adds optimized updateCopyDeck
    const slidesOptimizer = new GoogleSlidesOptimizer(credentials);

    const tokenData = await slidesOptimizer.verifyToken(msg.token)
    const payload = tokenData.getPayload()

    //get original slides data
    const presentationId = slidesOptimizer.getSlideIdFromUrl(msg.url);
    console.log('Received source slides with ID: ' + presentationId, socket)

    // copy source slides to new slides
    let newSlides = await slidesOptimizer.copySlides(presentationId, payload['email'])
    if (newSlides == '401') {
        await slidesOptimizer.generateAccessToken()
        newSlides = await slidesOptimizer.copySlides(presentationId, payload['email'])
    }

    // log URL to new slides
    console.log('Copied source slides to new presentation with ID: ' + newSlides, socket)

    // get all slides data
    const slidesData = await slidesOptimizer.getSlides(newSlides);
<<<<<<< HEAD
    if (slidesData == '403'){
        socket.emit("DisplayTxt", {txt: 'You do not have permission to access this deck.'})
    }
    if (slidesData == '400' || slidesData == '500'){
=======
    if (slidesData == '400' || slidesData == '500') {
>>>>>>> adds optimized updateCopyDeck
        socket.emit('noAccess');
        return
    }

    // Fish out all the images in slides data
    const imageElements = slidesOptimizer.getImageElements(slidesData);
    console.log('Found images in slides:' + imageElements.length, socket);

<<<<<<< HEAD
    let gifElements = [];
    let checkIfGifPromiseArray = [];
    for (const [index, imageElement] of imageElements.entries()) {
        checkIfGifPromiseArray.push(new Promise(async (resolve) => {
            // const mimeType = await getMimeType(imageElement.image.contentUrl)
            const isGif = await checkIfGif(imageElement.image.contentUrl);
            if (isGif) {
                //console.log(index + ': found GIF, adding to array');
                gifElements.push(imageElement);
            }
            resolve();
        }))
    }

    await Promise.all(checkIfGifPromiseArray);
    console.log('Found GIF images in slides: ' + gifElements.length, socket);

=======
    // find all gifs in imageElements
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(imageElements.length, 0);
    const pLimit = await import('p-limit'); // using this ESM package to limit concurrency of promises
    const limit = pLimit.default(100); // set limit to 100 promises at a time

    // function to run in each promise
    const inputPromise = async (imageElement) => {
        const isGif = await checkIfGif(imageElement.image.contentUrl)
        if (isGif) {
            return imageElement;
        } else {
            return 'not a gif';
        }
    }

    // add all promises to array
    const imageCheckPromises = imageElements.map(imageElement => {
        return limit(() => inputPromise(imageElement).then((result) => {
            progressBar.increment(1);
            return result;
        }))
    })

    const imageCheckingResult = await Promise.all(imageCheckPromises); // run all promises with limited concurrency

    const gifElements = imageCheckingResult.filter(result => {
        return result !== 'not a gif'; // filter results
    })
    progressBar.stop();

    console.log('Found GIF images in slides:' + gifElements.length, socket);
<<<<<<< HEAD
>>>>>>> Application refactor
    let gifs = {};
    console.log('Downloading gifs. Please wait.', socket);

    for (const [index, element] of gifElements.entries()) {
        socket.emit('DisplayTxt', { txt: "Downloading " + (index + 1) + " of " + gifElements.length });
        console.log("Downloading " + (index + 1) + " of " + gifElements.length, socket)
        const sourceImagePath = './gif/source/' + element.objectId + '.gif';
        if (!element.image.imageProperties['transparency']) {
            await downloadImageToDisk(element.image.contentUrl, sourceImagePath);
            // Display source preview
            const sourceUrl = element.image.contentUrl;
            gifs[element.objectId] = { id: element.objectId, source: sourceUrl, output: sourceUrl, id: element.objectId, deckId: newSlides }
        }
    }
=======


    console.log('Downloading gifs. Please wait.', socket);
    let gifs = {};
    progressBar.start(gifElements.length, 0); // start a new progress bar

    const downloadPromise = async (element) => {
        const url = element.image.contentUrl;
        const path = './gif/source/' + element.objectId + '.gif';
        await downloadImageToDisk(url, path);

        gifs[element.objectId] = {
            id: element.objectId,
            source: url,
            output: url,
            deckId: newSlides
        }

        progressBar.increment(1);
    }

    // add all promises to array
    const gifDownloads = gifElements.map(gifElement => {
        return limit(() => downloadPromise(gifElement));
    })

    const gifDownloadsResults = await Promise.all(gifDownloads); // run all promises with limited concurrency
    progressBar.stop();


>>>>>>> adds optimized updateCopyDeck
    console.log("Retrieving GIFs. Please wait...", socket);

    if (socket) socket.emit('DisplayGif', {gifarray: gifs});
}
