// server.js

const express = require('express');
const cors = require('cors');
const querystring = require('querystring');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());

// Spotify API credentials
const clientId = '81a5d59493f1499ba7fa4062d3c8377b';
const clientSecret = '22a96381b67742d3897ac1efa6b25188';
const redirectUri = 'http://localhost:5000/callback';

// Endpoint to initiate the Spotify authentication process
app.get('/login', (req, res) => {
    const scope = 'user-read-private user-read-email'; // Define your required scopes here
    const spotifyAuthUrl = 'http://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: clientId,
            scope: scope,
            redirect_uri: redirectUri,
        });
    res.json({ loginUrl: spotifyAuthUrl });
});

app.get('/callback', async (req, res) => {
    const code = req.query.code || null;

    if (!code) {
        return res.status(400).json({ error: 'Missing authorization code' });
    }

    try {
        const authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            method: 'post',
            params: {
                code: code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            },
            headers: {
                'Authorization': 'Basic ' + (Buffer.from(clientId + ':' + clientSecret).toString('base64')),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
        };

        // Exchange authorization code for access token and refresh token
        const response = await axios(authOptions);
        const { access_token, refresh_token } = response.data;

        // Redirect the user back to the frontend with the tokens
        res.redirect(`http://localhost:3000/?access_token=${access_token}&refresh_token=${refresh_token}`);
    } catch (error) {
        console.error('Error exchanging code for tokens:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/refresh_token', async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.status(400).json({ error: 'Missing refresh token' });
    }

    try {
        const authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            method: 'post',
            params: {
                grant_type: 'refresh_token',
                refresh_token: refresh_token,
            },
            headers: {
                'Authorization': 'Basic ' + (Buffer.from(clientId + ':' + clientSecret).toString('base64')),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
        };

        // Exchange refresh token for new access token
        const response = await axios(authOptions);
        const { access_token } = response.data;

        res.json({ access_token });
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});