var fs = require('fs');
var PubNub = require('pubnub');
var moment = require('moment');
var keyFilePath = '.config/keys.json';

module.exports.getPubnubInstanceWithUUIDAndAuthKeyIncludingSecretKey =
    function (uuid, authKey, isIncludingSecretKey) {
        if (fs.existsSync(keyFilePath)) {
            var keys = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
        } else {
            throw new Error('No key file exists!');
        }

        var config = {};
        config.publishKey = keys.publishKey;
        config.subscribeKey = keys.subscribeKey;
        if (isIncludingSecretKey) {
            config.secretKey = keys.secretKey;
        }
        if (uuid) {
            config.uuid = uuid;
        } else if (keys.uuid) {
            config.uuid = keys.uuid;
        }
        if (authKey) {
            config.authKey = authKey;
        } else if (keys.authKey) {
            config.authKey = keys.authKey;
        }
        console.log('* Configuration:');
        console.log(config);

        return new PubNub(config);
    };

module.exports.getCallbackConfig =
    function (pubnub, config) {
        return {
            status: function (statusEvent) {
                logObject({statusEvent: statusEvent});
                if (statusEvent.operation === 'PNSubscribeOperation') {
                    if (statusEvent.category === "PNConnectedCategory") {
                        console.log("Connected!!\n");
                        console.log('*** Subscribing ***********************************');
                        if (config.channels)
                            console.log('* Channels:\t', config.channels);
                        if (config.channelGroups)
                            console.log('* ChannelGroups:\t', config.channelGroups);
                        if (pubnub.getUUID())
                            console.log('* Subscriber:\t', pubnub.getUUID());
                        if (pubnub.getAuthKey())
                            console.log('* AuthKey\t:', pubnub.getAuthKey());
                        console.log('***************************************************');
                    }
                }

                if (statusEvent.operation === 'PNUnsubscribeOperation') {
                    if (typeof pubnub === 'object'
                    && typeof pubnub.disconnect === 'function') {
                        pubnub.disconnect();
                    }
                }

                if (typeof statusEvent.statusCode === 'number'
                    && !(statusEvent.statusCode >= 200
                        && statusEvent.statusCode < 300)
                    && typeof pubnub === 'object'
                    && typeof pubnub.disconnect === 'function'
                ) {
                    pubnub.disconnect();
                }

                console.log('');

            },
            message: function (message) {
                console.log(message);

                let channelName = message.channel;
                let channelGroup = message.subscription;
                let subscribedChannel = message.subscribedChannel;
                let pubTT = message.timetoken;
                let pubTime = moment(pubTT / 10000).format('YYYY-MM-DD (ddd) HH:mm:ss.SSS Z');
                let publisher = message.publisher;
                let msg = message.message;
                console.log("=== New Messagse!! ====================================");
                console.log("* Channel:\t", channelName);
                console.log("* Publisher:\t", publisher);
                console.log("* TimeToken:\t", pubTT);
                console.log("* Time:\t\t", pubTime)
                console.log("--- Content -------------------------------------------");
                if (typeof msg === 'object') {
                    console.log(JSON.stringify(msg, null, "\t"));
                } else {
                    console.log(msg);
                }
                console.log("=======================================================");
                console.log("");
            },
            presence: function (presenceEvent) {
                logObject({presenceEvent: presenceEvent});
                logObjectPretty(presenceEvent, "New Presence Event!!");
                console.log('');
            }
        }
    };

module.exports.logObject =
    function (object, title) {
        if (title) {
            console.log(title);
        }
        for (let key in object) {
            console.log('* ' + key.charAt(0).toUpperCase() + key.slice(1) + ':');
            console.log(object[key]);
        }
    };

module.exports.logObjectPretty =
    function (object, title, lineCharacter, valuePadding) {

        let spaceInTab = 8;
        let sortedKeyLengthList = Object.keys(object).map(key => key.length);
        if (sortedKeyLengthList.length > 0) {
            var maxKeyLength = sortedKeyLengthList.reduce((a, b) => a > b ? a : b);
        } else {
            var maxKeyLength = 0;
        }
        let numberOfTabFromStart = Math.ceil((maxKeyLength + 4) / spaceInTab);

        let paddingForValue = valuePadding || 40;
        let outerLineWidth = numberOfTabFromStart * spaceInTab + paddingForValue;
        if (!(typeof lineCharacter === 'string' && lineCharacter.length == 1))
            lineCharacter = '='
        let upperLine = lineCharacter.repeat(3);
        if (title) {
            upperLine += ' ' + title + ' ';
        }
        upperLine += lineCharacter.repeat(outerLineWidth);

        console.log(upperLine.slice(0, outerLineWidth));

        var objectValues = {};
        let numberOfPrimitiveValue = 0;
        let numberOfObjectValue = 0;

        for (let key in object) {
            let value = object[key];

            if (value && typeof value === 'object') {
                numberOfObjectValue += 1;
                objectValues[key] = value;
            } else {
                numberOfPrimitiveValue += 1;
                let sub = '* ' + key.charAt(0).toUpperCase() + key.slice(1) + ':';
                let numberOfTab = numberOfTabFromStart - Math.floor(sub.length / spaceInTab)
                sub += '\t'.repeat(numberOfTab);
                console.log(sub, object[key]);
            }
        }

        for (let key in objectValues) {
            if (numberOfPrimitiveValue) {
                console.log('-'.repeat(outerLineWidth - 8));
            }

            let value = objectValues[key];
            let sub = '* ' + key.charAt(0).toUpperCase() + key.slice(1) + ':';

            if (Array.isArray(value)) {
                if (value.length > 0) {
                    console.log(sub);
                    for (let element of value) {
                        console.log(' ', element);
                    }
                } else {
                    console.log(sub, value);
                }
            } else if (value) {
                let valueDescription = JSON.stringify(value, undefined, '    ');
                console.log(sub);
                console.log(valueDescription.replace(/(^|\n)/g, '$1  '));
            } else {
                console.log(sub, value);
            }
        }

        console.log(lineCharacter.repeat(outerLineWidth));
    }