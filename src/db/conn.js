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
        if (!mongodb.connectionString)
            throw new Error('MongoDB connection string not provided. Check your .env file.')
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

    count(table) {
        return this.db.collection(table).estimatedDocumentCount()
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

    aggregate(table, pipeline) {
        return this.db.collection(table).aggregate(pipeline).toArray()
    }

    get(table, id) {
        return this.db.collection(table).findOne(resolveQuery(id))
    }

    getBy(table, key, value) {
        return this.db.collection(table).findOne({ [key]: value })
    }

    getManyBy(table, key, value) {
        return this.db
            .collection(table)
            .find({ [key]: value })
            .toArray()
    }

    findOne(table, query) {
        return this.db.collection(table).findOne(query)
    }

    getPaginated(
        table,
        limit,
        last = {
            key: '',
            value: 0
        },
        filter = []
    ) {
        if (filter.length > 0)
            return this.db
                .collection(table)
                .find({
                    id: { $in: filter },
                    [last.key]: { $lt: last.value }
                })
                .sort({ [last.key]: -1 })
                .limit(limit)
                .toArray()
        return this.db
            .collection(table)
            .find({ [last.key]: { $lt: last.value } })
            .sort({ [last.key]: -1 })
            .limit(limit)
            .toArray()
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

    deleteRaw(table, index) {
        return this.db.collection(table).deleteOne(index)
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

    updateRaw(table, index, doc, upsert) {
        return this.db
            .collection(table)
            .updateOne(
                index,
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

export const mongo = new MongoController()
