const { Jimp } = require('jimp');

async function main() {
    console.log('Reading build/icon.png...');
    const image = await Jimp.read('build/icon.png');
    const width = image.width;
    const height = image.height;
    // Use 30% radius (aggressive cut)
    const radius = width * 0.30;
    console.log(`Applying rounded mask (Radius: ${radius}px)...`);

    image.scan(0, 0, width, height, function (x, y, idx) {
        let dist = 0;
        let inCorner = false;

        if (x < radius && y < radius) { // Top Left
            dist = Math.sqrt(Math.pow(x - radius, 2) + Math.pow(y - radius, 2));
            inCorner = true;
        } else if (x > width - radius && y < radius) { // Top Right
            dist = Math.sqrt(Math.pow(x - (width - radius), 2) + Math.pow(y - radius, 2));
            inCorner = true;
        } else if (x < radius && y > height - radius) { // Bottom Left
            dist = Math.sqrt(Math.pow(x - radius, 2) + Math.pow(y - (height - radius), 2));
            inCorner = true;
        } else if (x > width - radius && y > height - radius) { // Bottom Right
            dist = Math.sqrt(Math.pow(x - (width - radius), 2) + Math.pow(y - (height - radius), 2));
            inCorner = true;
        }

        if (inCorner && dist > radius) {
            this.bitmap.data[idx + 3] = 0; // Transparent
        }
    });

    await new Promise((resolve, reject) => {
        image.write('build/icon.png', (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
    console.log('Success: build/icon.png updated with rounded corners.');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
