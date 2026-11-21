// Upload the published JSON to Azure Blob Storage using AZ_BLOB_CONN_STRING.
// Also creates the container (public blob read) and allows the site origins via CORS.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

const conn = process.env.AZ_BLOB_CONN_STRING;
if (!conn) throw new Error('AZ_BLOB_CONN_STRING is not set');

const get = (key) => new RegExp(`${key}=([^;]+)`, 'i').exec(conn)?.[1];
const account = get('AccountName');
const key = get('AccountKey');
if (!account || !key) throw new Error('Connection string is missing AccountName or AccountKey');
const suffix = get('EndpointSuffix') || 'core.windows.net';
const containerName = process.env.AZ_BLOB_CONTAINER || 'status';
const blobName = process.env.AZ_BLOB_NAME || 'status.json';
const file = path.resolve(process.env.FILE || 'dist/data/status.json');

const service = new BlobServiceClient(`https://${account}.blob.${suffix}`, new StorageSharedKeyCredential(account, key));
const container = service.getContainerClient(containerName);
await container.createIfNotExists();
try {
  await container.setAccessPolicy('blob');
} catch (error) {
  if (error?.code === 'PublicAccessNotPermitted') {
    console.warn('WARNING: storage account blocks public blob access. Enable "Allow blob public access" in Azure, then rerun this job.');
  } else {
    throw error;
  }
}

const properties = await service.getProperties();
await service.setProperties({
  ...properties,
  cors: [{
    allowedOrigins: [
      'https://arewefucked.xyz',
      'https://www.arewefucked.xyz',
      'https://white-cliff-09a42e610.3.azurestaticapps.net',
      'http://localhost:8080',
    ].join(','),
    allowedMethods: 'GET,HEAD',
    allowedHeaders: '*',
    exposedHeaders: '*',
    maxAgeInSeconds: 300,
  }],
});

const blob = container.getBlockBlobClient(blobName);
await blob.uploadData(await readFile(file), {
  contentType: 'application/json',
  cacheControl: 'no-cache, no-store, must-revalidate',
});
console.log(`Uploaded ${path.basename(file)} → ${blob.url}`);
