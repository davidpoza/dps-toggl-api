module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2018
    },
    "rules": {
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "windows"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-multi-assign":0,
        "prefer-destructuring":0,
        "no-undef": 0,
        "func-names": 0,
        "padded-blocks": 0,
        "space-before-blocks": 0,
        "space-before-function-paren": 0,
        "no-console": 0,
        "no-redeclare": 0
    }
};