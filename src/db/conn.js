// Copyright (c) 2017-2019 dirigeants. All rights reserved. MIT license.
// This file contains modified code from dirigeants.
import { MongoClient as Mongo } from 'mongodb'
import { isObject, mergeObjects, makeObject } from '@sapphire/utilities'
import { mongodb } from '../config.js'

class MongoController {
    constructor() {
        this.db = null
    }

    async init() {
        const mongoClient = await Mongo.connect(mongodb.connectionString, mongodb.options)
        this.db = mongoClient.db(mongodb.name)
    }

    // Table Methods

    get exec() {
        return this.db
    }

    hasTable(table) {
        return this.db
            .listCollections()
            .toArray()
            .then((collections) => collections.some((col) => col.name === table))
    }

    createTable(table) {
        return this.db.createCollection(table)
    }

    deleteTable(table) {
        return this.db.dropCollection(table)
    }

    // Document methods

    getAll(table, filter = []) {
        if (filter.length)
            return this.db
                .collection(table)
                .find({ id: { $in: filter } }, { _id: 0 })
                .toArray()
        return this.db.collection(table).find({}, { _id: 0 }).toArray()
    }

    getKeys(table) {
        return this.db.collection(table).find({}, { id: 1, _id: 0 }).toArray()
    }

    get(table, id) {
        return this.db.collection(table).findOne(resolveQuery(id))
    }

    has(table, id) {
        return this.get(table, id).then(Boolean)
    }

    getRandom(table) {
        return this.db.collection(table).aggregate({ $sample: { size: 1 } })
    }

    create(table, id, doc = {}) {
        return this.db
            .collection(table)
            .insertOne(mergeObjects(parseUpdateInput(doc), resolveQuery(id)))
    }

    delete(table, id) {
        return this.db.collection(table).deleteOne(resolveQuery(id))
    }

    update(table, id, doc, upsert) {
        return this.db
            .collection(table)
            .updateOne(
                resolveQuery(id),
                { $set: isObject(doc) ? flatten(doc) : parseEngineInput(doc) },
                { upsert: Boolean(upsert) }
            )
    }

    reset(table, id, doc) {
        return this.db.collection(table).updateOne(resolveQuery(id), {
            $unset: isObject(doc) ? flatten(doc) : parseEngineInput(doc)
        })
    }

    replace(table, id, doc) {
        return this.db.collection(table).replaceOne(resolveQuery(id), parseUpdateInput(doc))
    }
}

const resolveQuery = (query) => (isObject(query) ? query : { id: query }) // eslint-disable-line no-extra-parens

function flatten(obj, path = '') {
    let output = {}
    for (const [key, value] of Object.entries(obj)) {
        if (isObject(value))
            output = Object.assign(output, flatten(value, path ? `${path}.${key}` : key))
        else output[path ? `${path}.${key}` : key] = value
    }
    return output
}

function parseEngineInput(updated) {
    return Object.assign({}, ...updated.map((entry) => ({ [entry.data[0]]: entry.data[1] })))
}

function parseUpdateInput(updated) {
    if (isObject(updated)) return updated
    const updateObject = {}
    for (const entry of updated)
        mergeObjects(updateObject, makeObject(entry.data[0], entry.data[1]))
    return updateObject
}

export default MongoController
