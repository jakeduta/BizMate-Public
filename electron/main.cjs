const { app, BrowserWindow, dialog } = require('electron');
const net = require('net');
const path = require('path');
const { pathToFileURL } = require('url');

let mainWindow = null;

function findAvailablePort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.on('error', () => resolve(findAvailablePort(port + 1)));
        server.listen(port, () => server.close(() => resolve(port)));
    });
}

function waitForPort(port, retries, delay) {
    retries = retries === undefined ? 40 : retries;
    delay = delay === undefined ? 500 : delay;
    return new Promise((resolve, reject) => {
        const attempt = () => {
            const client = net.createConnection({ port: port, host: '127.0.0.1' });
            client.on('connect', () => { client.destroy(); resolve(); });
            client.on('error', () => {
                if (--retries <= 0) reject(new Error('Backend did not start in time'));
                else setTimeout(attempt, delay);
            });
        };
        attempt();
    });
}

async function startBackend(port) {
    const isDev = !app.isPackaged;
    const backendEntry = isDev
        ? path.join(__dirname, '..', 'backend', 'server.js')
        : path.join(app.getAppPath(), 'backend', 'server.js');

    // Set env vars BEFORE importing so dotenv won't override them
    process.env.PORT = String(port);
    process.env.NODE_ENV = 'production';

    await import(pathToFileURL(backendEntry).href);
}

function createWindow(port) {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.loadURL('http://localhost:' + port);
    mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
    try {
        const port = await findAvailablePort(5050);
        await startBackend(port);
        await waitForPort(port);
        createWindow(port);
    } catch (err) {
        dialog.showErrorBox('BizMate Startup Error', err.message);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
