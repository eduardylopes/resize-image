import { S3 } from '@aws-sdk/client-s3';
import { readFileAsync, unlink } from 'fs';
import { resize } from 'imagemagick';
import { tmpdir } from 'os';
import { promisify } from 'util';
import uuidv4 from 'uuid/v4';

const resizeAsync = promisify(resize);

const s3 = new S3({ region: 'sa-east-1' });

export async function handler(event) {
  const filesProcessed = event.Records.map(async (record) => {
    const bucket = record.s3.bucket.name;
    const filename = record.s3.object.key;

    // Get file from S3
    let params = {
      Bucket: bucket,
      Key: filename,
    };
    const inputData = await s3.getObject(params).promise();

    // Resize the file
    const tempFile = tmpdir() + '/' + uuidv4() + '.jpg';
    const resizeArgs = {
      srcData: inputData.Body,
      dstPath: tempFile,
      width: 150,
    };
    await resizeAsync(resizeArgs);

    // Read the resized file
    const resizedData = await readFileAsync(tempFile);

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
    return unlink(tempFile);
  });

  await Promise.all(filesProcessed);
}
