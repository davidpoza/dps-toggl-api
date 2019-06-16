const utils = {
    validEmail: (email) => {
        let re = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        return re.test(email);
    },

    getIp: (req)=>{
        let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        return ip;
    }
};
module.exports = utils;