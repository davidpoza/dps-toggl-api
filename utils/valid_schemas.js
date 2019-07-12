const regex_objectId = /^[a-f\d]{24}$/i;
const regex_color = /^#[abcdef0-9]{6}$/;
const regex_password = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!?/@.-_=])[0-9a-zA-Z!?/@.-_=]{8,}$/;
const regex_date = /^\d{4}-\d{2}-\d{2}$/;
const regex_hour = /^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/; //formato HH:MM:SS
const regex_email = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

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

            "email": {
                "type": "string", "minLength": 6, "maxLength": 40,
                "pattern": regex_email,
                "required": true },
            "current_task_start_hour": {"type": "null"},
            "current_task_date": {"type": "null"},
            "current_task_desc": {"type": "null"}
        },
        "additionalProperties": false
    },
    update_user: {
        "type": "object",
        "properties": {
            "first_name": { "type": "string", "maxLength": 40 },
            "last_name": { "type": "string", "maxLength": 40 },
            "current_password": { "type": "string" },
            "password": {
                "type": "string", "minLength": 8, "maxLength": 40,
                "pattern": regex_password
            },
            "repeat_password": {
                "type": "string", "minLength": 8, "maxLength": 40,
                "pattern": regex_password
            },
            "active": Boolean,
            "admin": Boolean,
            "current_task_start_hour": { "anyOf": [{"type": "string", "pattern": regex_hour, "required": false}, {"type": "null"}]},
            "current_task_date": { "anyOf": [{ "type": "string", pattern: regex_date, "required": false}, {"type": "null"}]},
            "current_task_desc": { "anyOf": [{ "type": "string", "minLength": 1, "maxLength": 120, "required": false }, {"type": "null"}]}
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
            "delete_members": { "type": "array", "items": { "type": "string", "pattern": regex_objectId } },
            "add_tasks": { "type": "array", "items": { "type": "string", "pattern": regex_objectId } },
            "delete_tasks": { "type": "array", "items": { "type": "string", "pattern": regex_objectId } }
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
            "project": { "anyOf": [{"type": "null"},{"type": "string", "pattern": regex_objectId}] },
            "user": { "type": "string", "pattern": regex_objectId },
            "hour_value": { "type": "number", "minimum": 0 }
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
            "project": { "anyOf": [{"type": "null"},{"type": "string", "pattern": regex_objectId}] },
            "hour_value": { "type": "number", "minimum": 0 }
        },
        "additionalProperties": false
    },
};
module.exports = validSchemas;