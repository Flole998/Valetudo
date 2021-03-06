// Modifications copyright (C) Flole
const dgram = require("dgram");
const MiioSocket = require("./MiioSocket");
const Logger = require("../Logger");

class Dummycloud {
    /**
     * @param {object} options
     * @param {string} options.spoofedIP The IP we've told miio we are
     * @param {Buffer} options.cloudKey The pre-shared unique key of your robot
     * @param {string} options.deviceId The unique Device-id of your robot
     * @param {string} options.bindIP "127.0.0.1" on the robot, "0.0.0.0" in development
     * @param {() => void} options.onConnected  function to call after completing a handshake
     * @param {(msg: any) => boolean} options.onMessage  function to call for incoming messages
     */
    constructor(options) {
        this.spoofedIP = options.spoofedIP;
        this.bindIP = options.bindIP;

        this.socket = dgram.createSocket("udp4");
        this.socket.bind(Dummycloud.PORT, this.bindIP);

        this.socket.on("listening", () => {
            Logger.info("Dummycloud is spoofing " + this.spoofedIP + ":8053 on " + this.bindIP + ":" +
                        Dummycloud.PORT);
        });

        this.miioSocket = new MiioSocket({
            socket: this.socket,
            token: options.cloudKey,
            onMessage: this.handleMessage.bind(this),
            onConnected: options.onConnected,
            deviceId: options.deviceId,
            rinfo: undefined,
            timeout: 2000,
            name: "cloud",
            doTimesync: true
        });

        this.onMessage = options.onMessage;
    }

    handleMessage(msg) {
        // some default handling.
        switch (msg.method) {
            case "_otc.info":
                this.miioSocket.sendMessage({
                    "id": msg.id,
                    "result": {
                        "otc_list": [{"ip": this.spoofedIP, "port": Dummycloud.PORT}],
                        "otc_test": {
                            "list": [{"ip": this.spoofedIP, "port": Dummycloud.PORT}],
                            "interval": 1800,
                            "firsttest": 1193
                        }
                    }
                });
                return;
        }
        if (!this.onMessage(msg)) {
            Logger.info("Unknown cloud message received:", JSON.stringify(msg));
        }
    }

    /**
     * Shutdown Dummycloud
     *
     * @returns {Promise<void>}
     */
    async shutdown() {
        await this.miioSocket.shutdown();
    }
}
/**
 * @constant
 * The miio port the dummycloud listens on.
 */
Dummycloud.PORT = 8053;

module.exports = Dummycloud;