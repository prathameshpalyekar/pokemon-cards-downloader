const axios = require('axios');
const request = require('request');
const fs = require('fs');
const async = require('async');
const Promise = require('bluebird');
const path = require('path');

const API = 'https://api.pokemontcg.io/v1/cards?nationalPokedexNumber='

const POKEMON_NUMBERS = [];
const START = 1;
const END = 40;
const PARALLE_LIMIT = 40;

for (let index = START; index <= END; index ++) {
    POKEMON_NUMBERS.push(index);
}


fetchPokemons().then((res) => {
    process.exit(0);
}).catch((err) => {
    console.log(err);
    process.exit(0);
});

function fetchPokemons() {
    return new Promise((resolve, reject) => {
        async.parallelLimit(
            POKEMON_NUMBERS.map(number => {
                return async.asyncify(() => fetchPokemon(number));
            }),
            PARALLE_LIMIT,
            (err, res) => {
                if (err) {
                    console.log(err)
                    reject(err);
                    return false
            }

            console.log('Download complete');
            resolve(res);
        });
    });
}

function fetchPokemon(number) {
    return new Promise((resolve, reject) => {
        axios({
            url: API + number,
            method: 'GET',
            responseType: 'json',
        }).then(function (response) {
            const data = response.data;
            const { cards } = data;

            makeFolder(number).then((res) => {
                const count = 'Collection count for pokemon number ' + number + ' is : ' + cards.length;
                console.log(count)
                downloadImages(cards, number).then((res) => {
                    console.log('Collection complete for ', number);
                    return resolve(true);
                }).catch((err) => {
                    return reject(err);
                });
            }).catch((err) => {
                return reject(err);
            })
        }).catch((err) => {
            console.log(err);
            return reject(err)
        });
    });
}

const downloadImages = function(cards, number) {
    return new Promise((resolve, reject) => {
        async.series(cards.map((card)  => async.asyncify(() => {
            
            return downloadCard(card, number);

        })), function (err) {
            if (err){
                console.log(err);
                return reject(err);
            }
            return resolve(true);
        });
    });
}

const downloadCard = function(card, number) {
    return new Promise((resolve, reject) => {
        const { id, name, imageUrlHiRes, imageUrl } = card;
        const uri = imageUrlHiRes || imageUrl;
        const extension = uri.split('.').pop();
        const filename = '../collection/' + '#' + number  + '/' + name + '_' + id + '.' + extension;

        checkIfFileExists(filename).then((res) => {
            if (!res) {
                downloadImage(uri, filename, () => {
                    return resolve(true);
                });
            } else {
                return resolve(true)
            }
        }).catch((err) => {
            console.log(err);
            return reject(err);
        });
    });
}

const checkIfFileExists = function(filename) {
    return new Promise((resolve, reject) => {
        fs.access(filename, fs.F_OK, (err) => {
            if (err) {
                return resolve(false);
            }

            return resolve(true);
        })
    });
}

const downloadImage = function(uri, filename, callback) {
  	request.head(uri, function(err, res, body) {
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

function makeFolder(number) {
    return new Promise((resolve, reject) => {
        const directory = '../collection/#' + number;
        if (fs.existsSync(directory)) {
            return resolve(true);
        }

        fs.mkdir(directory, { recursive: true }, (err) => {
            if (err) {
                return reject(err);
            }
            return resolve(true);
        });
    });
}
