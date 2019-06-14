const regex_objectId = /^[a-f\d]{24}$/i;
const regex_color = /^#[abcdef0-9]{6}$/;
const regex_password = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!?/@.-_=])[0-9a-zA-Z!?/@.-_=]{8,}$/;
const regex_date = /\d{4}\/\d{2}\/\d{2}$/;
const regex_hour = /([01][0-9]|2[0-3]):[0-5][0-9]/;
const validSchemas = {
    register_user: {
        "type": "object",
        "properties": {
            "first_name": { "type": "string", "minLength": 1, "maxLength": 40},
            "last_name": { "type": "string", "minLength": 1, "maxLength": 40},
            "password": {
                "type": "string", "minLength": 8, "maxLength": 40,
                "pattern": regex_password,
                "required": true
            },

            "email": { "type": "string", "minLength": 6, "maxLength": 40, "required": true }
        },
        "additionalProperties": false
    },
    update_user: {
        "type": "object",
        "properties": {
            "first_name": { "type": "string", "minLength": 1, "maxLength": 40 },
            "last_name": { "type": "string", "minLength": 1, "maxLength": 40 },
            "current_password": { "type": "string" },
            "password": {
                "type": "string", "minLength": 8, "maxLength": 40,
                "pattern": regex_password
            },
            "repeat_password": {
                "type": "string", "minLength": 8, "maxLength": 40,
                "pattern": regex_password
            }
        },
        "additionalProperties": false
    },
    create_project: {
        "type": "object",
        "properties": {
            "name": { "type": "string", "minLength": 1, "maxLength": 40, "required": true },
            "color": { "type": "string", "pattern": regex_color, "required": true },
        },
        "additionalProperties": false
    },
    update_project: {
        "type": "object",
        "properties": {
            "name": { "type": "string", "minLength": 1, "maxLength": 40 },
            "color": { "type": "string", "pattern": regex_color },
            "add_members": { "type": "array", "items": { "type": "string", "pattern": regex_objectId } },
            "delete_members": { "type": "array", "items": { "type": "string", "pattern": regex_objectId } }
        },
        "additionalProperties": false
    },
    create_tag: {
        "type": "object",
        "properties": {
            "name": { "type": "string", "minLength": 1, "maxLength": 40, "required": true }
        },
        "additionalProperties": false
    },
    update_tag: {
        "type": "object",
        "properties": {
            "name": { "type": "string", "minLength": 1, "maxLength": 40 },
            "tasks": { "type": "array", "items": { "type": "string", "pattern": regex_objectId }},
        },
        "additionalProperties": false
    },
    create_task: {
        "type": "object",
        "properties": {
            "desc": { "type": "string", "minLength": 1, "maxLength": 120, "required": true },
            "date": { "type": "string", pattern: regex_date, "required": true},
            "start_hour": { "type": "string", pattern: regex_hour, "required": true},
            "end_hour": { "type": "string", pattern: regex_hour, "required": true},
            "tags": { "type": "array", "items": { "type": "string", "pattern": regex_objectId }},
            "project": { "type": "string", "pattern": regex_objectId },
        },
        "additionalProperties": false
    },
    update_task: {
        "type": "object",
        "properties": {
            "desc": { "type": "string", "minLength": 1, "maxLength": 120 },
            "date": { "type": "string", pattern: regex_date},
            "start_hour": { "type": "string", pattern: regex_hour},
            "end_hour": { "type": "string", pattern: regex_hour},
            "add_tags": { "type": "array", "items": { "type": "string", "pattern": regex_objectId }},
            "delete_tags": { "type": "array", "items": { "type": "string", "pattern": regex_objectId }},
            "project": { "type": "string", "pattern": regex_objectId },
        },
        "additionalProperties": false
    },
};
module.exports = validSchemas;