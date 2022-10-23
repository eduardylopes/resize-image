const { S3 } = require('aws-sdk');
const { readFile, unlink } = require('fs/promises');

const Jimp = require('jimp');
const { tmpdir } = require('os');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const s3 = new S3({ region: 'sa-east-1' });

exports.handler = async (event) => {
  const filesProcessed = event.Records.map(async (record) => {
    const bucket = record.s3.bucket.name;
    const filename = record.s3.object.key;

    // Get file from S3
    let params = {
      Bucket: bucket,
      Key: filename,
    };

    const { Body: imageBuffer } = await s3.getObject(params).promise();

    // Resize the file
    const tempFile = path.join(tmpdir(), `${uuidv4()}.jpg`);
    const image = await Jimp.read(imageBuffer);
    image.resize(250, 250);
    image.quality(50);
    await image.writeAsync(tempFile);

    // Read the resized file
    const resizedData = await readFile(tempFile);

    // Upload the new file to s3
    const targetFilename =
      filename.substring(0, filename.lastIndexOf('.')) + '-small.jpg';

    params = {
      Bucket: bucket + '-dest',
      Key: targetFilename,
      Body: new Buffer.from(resizedData),
      ContentType: 'image/jpeg',
    };

    await s3.putObject(params).promise();
    await unlink(tempFile);
  });

  await Promise.all(filesProcessed);
};
