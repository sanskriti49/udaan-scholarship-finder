import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { crawlerLockKey } from "../../src/pipeline/lock.js";

test("crawler leases are shared within a database, isolated across environments, and omit credentials",()=>{
	const oldUri=process.env.MONGO_URI,oldName=mongoose.connection.name;
	try {
		process.env.MONGO_URI="mongodb+srv://test-user:example-password@cluster.example/test";
		mongoose.connection.name="test";
		const key=crawlerLockKey();
		process.env.MONGO_URI="mongodb+srv://other-user:other-password@cluster.example/test";
		assert.equal(crawlerLockKey(),key);
		assert.doesNotMatch(key,/password|test-user|cluster\.example/);
		mongoose.connection.name="production";
		assert.notEqual(crawlerLockKey(),key);
	} finally {
		if(oldUri===undefined)delete process.env.MONGO_URI;else process.env.MONGO_URI=oldUri;
		mongoose.connection.name=oldName;
	}
});
