import * as Config from '../../Config';
import * as DataPeps from '../../../src/DataPeps';
import * as nacl from 'tweetnacl';
import { expect } from 'chai';
import * as mocha from 'mocha';
import * as Long from 'long';

class ResourceContent {
  plain: Uint8Array
  encrypted: Uint8Array

  constructor(resource: DataPeps.Resource<{}>, content: string) {
    let textEncoder = new TextEncoder()
    this.plain = textEncoder.encode(content)
    this.encrypted = resource.encrypt(this.plain)
  }
}

class Resource {
  resource: DataPeps.Resource<{}>
  content: ResourceContent

  constructor(resource: DataPeps.Resource<{}>, content: string) {
    this.resource = resource
    this.content = new ResourceContent(resource, content)
  }
}

function checkFetchedResource(
    resourceFetched: DataPeps.Resource<{}>,
    resourceExpected: Resource) {
  expect(resourceFetched).to.not.be.null
  expect(resourceFetched.id).to.be.deep.equals(resourceExpected.resource.id)
  expect(resourceFetched.payload)
    .to.be.deep.equals(resourceExpected.resource.payload)
  let decryptedContent =
    resourceFetched.decrypt(resourceExpected.content.encrypted)
  expect(decryptedContent).to.not.be.null
  expect(decryptedContent).to.be.deep.equals(resourceExpected.content.plain)
}

function checkResourceNotFoundError(err,
    resourceId: DataPeps.ID, errorOccurred: {isTrue: boolean}) {
  expect(err).to.not.be.null
  expect(err).instanceof(DataPeps.Error)
  expect(err.kind).equal(DataPeps.ServerError.ResourceNotFound)
  expect(err.payload.id).to.be.deep.equals(resourceId)
  errorOccurred.isTrue = true
}

async function fetchAndCheckResource(
    session: DataPeps.Session,
    resource: Resource) : Promise<DataPeps.Resource<{}>> {
  let resourceFecthed = await session.Resource.get(resource.resource.id)
  checkFetchedResource(resourceFecthed, resource)
  return Promise.resolve(resourceFecthed)
}


describe('Resource.extendSharingGroup', () => {
  let seed = Math.floor(Math.random() * 99999)

  let aliceSecret = nacl.randomBytes(128)
  let alice: DataPeps.IdentityFields = {
      login: "alice." + seed + "@peps.test",
      name: "Alice test identity, TS",
      kind: "user",
      payload: null,
  }

  let bobSecret = nacl.randomBytes(128)
  let bob: DataPeps.IdentityFields = {
      login: "bob." + seed + "@peps.test",
      name: "Bob test identity, TS",
      kind: "user",
      payload: null,
  }

  let charlieSecret = nacl.randomBytes(128)
  let charlie: DataPeps.IdentityFields = {
      login: "charlie." + seed + "@peps.test",
      name: "Charlie test identity, TS",
      kind: "user",
      payload: null,
  }

  let daveSecret = nacl.randomBytes(128)
  let dave : DataPeps.IdentityFields = {
    login: "dave." + seed + "@peps.test",
    name: "Dave test identity, TS",
    kind: "user",
    payload: null,
  }

  let inexistantLogin = "john." + seed + "@peps.test";

  let aliceSession: DataPeps.Session,
      bobSession: DataPeps.Session,
      charlieSession: DataPeps.Session,
      daveSession: DataPeps.Session

  let resourceA: Resource
  let resourceB: Resource
  let resourceC: Resource
  let resourceD: Resource

  let randomResourceId: number
  let randomResourceIdLong: Long
  
  before(async() => {
      await Config.init()
      await DataPeps.register(alice, aliceSecret)
      await DataPeps.register(bob, bobSecret)
      await DataPeps.register(charlie, charlieSecret)
      await DataPeps.register(dave, daveSecret)
      aliceSession = await DataPeps.login(alice.login, aliceSecret)
      bobSession = await DataPeps.login(bob.login, bobSecret)
      charlieSession = await DataPeps.login(charlie.login, charlieSecret)
      daveSession = await DataPeps.login(dave.login, daveSecret)
      
      let resourceADataPeps = await aliceSession.Resource.create(
        "test kind",
        { text: "payload A" },
        [alice.login]
      )
      resourceA = new Resource(resourceADataPeps, "Content A")
      
      let resourceBDataPeps = await aliceSession.Resource.create(
        "test kind",
        { text: "payload B" },
        []
      )
      resourceB = new Resource(resourceBDataPeps, "Content B")

      let resourceCDataPeps = await aliceSession.Resource.create(
        "test kind",
        { text: "payload C" },
        [alice.login] 
      )
      resourceC = new Resource(resourceCDataPeps, "Content C")

      let resourceDDataPeps = await aliceSession.Resource.create(
        "test kind",
        { text: "payload D" },
        [alice.login] 
      )
      resourceD = new Resource(resourceDDataPeps, "Content D")

      randomResourceId = Math.floor(Math.random() * 0xFFFFFFFF)

      let low = Math.floor(Math.random() * 0xFFFFFFFF)
      let high = Math.floor(Math.random() * 0x7FFFFFFF)
      randomResourceIdLong = new Long(low, high, true);
  })

  it("An identity that is not a Resource A sharer cannot add an himself to the resource sharers", async() => {
    let errorOccurred = {isTrue: false}
    try {
      await bobSession.Resource.get(resourceA.resource.id)
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceA.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true

    errorOccurred.isTrue = false
    try {
      await bobSession.Resource.extendSharingGroup(resourceA.resource.id,
        [bob.login])
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceA.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true
  })

  it("An identity that is not a Resource A sharer cannot add an identity to the resource sharers", async() => {
    let errorOccurred = {isTrue: false}
    try {
      await bobSession.Resource.get(resourceA.resource.id)
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceA.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true

    errorOccurred.isTrue = false
    try {
      await bobSession.Resource.extendSharingGroup(resourceA.resource.id,
        [charlie.login])
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceA.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true
  })

  it ("A sharer that is a Resource A sharer since the resource creation can add an identitiy to the resource sharers", async() => {
    await fetchAndCheckResource(aliceSession, resourceA)
    let errorOccurred = {isTrue: false}
    try {
      await bobSession.Resource.get(resourceA.resource.id)
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceA.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true

    await aliceSession.Resource.extendSharingGroup(resourceA.resource.id,
      [bob.login])
    fetchAndCheckResource(bobSession, resourceA)
  })

  it ("An added sharer can add an identity to the sharing group of Resource A",
      async() => {
    await fetchAndCheckResource(bobSession, resourceA)

    let errorOccurred = {isTrue: false}
    try {
      await charlieSession.Resource.get(resourceA.resource.id)
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceA.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true

    await bobSession.Resource.extendSharingGroup(resourceA.resource.id,
      [charlie.login])
    await fetchAndCheckResource(charlieSession, resourceA)
  })

  it ("If the creator of Resource B is not a sharer, he cannot add himself to sharers", async() => {
    let errorOccurred = {isTrue: false}
    try {
      await aliceSession.Resource.get(resourceB.resource.id)
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceB.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true

    errorOccurred.isTrue = false
    try {
      await aliceSession.Resource
        .extendSharingGroup(resourceB.resource.id, [alice.login])
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceB.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true
  })

  it ("If the creator of Resource B is not a sharer, he cannot add another identity to sharers", async() => {
    let errorOccurred = {isTrue: false}
    try {
      await aliceSession.Resource.get(resourceB.resource.id)
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceB.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true

    errorOccurred.isTrue = false
    try {
      await aliceSession.Resource
        .extendSharingGroup(resourceB.resource.id, [bob.login])
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceB.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true
  })

  it ("An identity cannot add himself to the Resource B sharers, when the sharing group of the resource is empty", async() => {
    let errorOccurred = {isTrue: false}
    try {
      await bobSession.Resource.get(resourceB.resource.id)
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceB.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true

    errorOccurred.isTrue = false
    try {
      await bobSession.Resource
        .extendSharingGroup(resourceB.resource.id, [bob.login])
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceB.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true
  })

  it ("An identity cannot add another identity to the Resource B sharers, when the sharing group of the resource is empty", async() => {
    let errorOccurred = {isTrue: false}
    try {
      await bobSession.Resource.get(resourceB.resource.id)
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceB.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true

    errorOccurred.isTrue = false
    try {
      await bobSession.Resource
        .extendSharingGroup(resourceB.resource.id, [charlie.login])
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceB.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true
  })

  it("No error occurs when a sharer extends the sharing group of the resource C with the same user twice", async() => {
    await fetchAndCheckResource(aliceSession, resourceC)
    
    let errorOccurred = {isTrue: false}
    try {
      await bobSession.Resource.get(resourceC.resource.id)
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceC.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true
    
    for (let i = 0; i < 2; i++) {
      await aliceSession.Resource.extendSharingGroup(resourceC.resource.id,
        [bob.login])
      await fetchAndCheckResource(bobSession, resourceC)
    }
  })

  it("No error occurs when a sharer extends the sharing group of the resource C with a repeated user", async() => {
    await fetchAndCheckResource(aliceSession, resourceC)
    await fetchAndCheckResource(bobSession, resourceC)
    await aliceSession.Resource.extendSharingGroup(resourceC.resource.id,
      [bob.login, bob.login])
    await fetchAndCheckResource(aliceSession, resourceC)
    await fetchAndCheckResource(bobSession, resourceC)

    let errorOccurred = {isTrue: false}
    try {
      await charlieSession.Resource.get(resourceC.resource.id)
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceC.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true

    await aliceSession.Resource.extendSharingGroup(resourceC.resource.id,
      [charlie.login, charlie.login])

    await fetchAndCheckResource(aliceSession, resourceC)
    await fetchAndCheckResource(bobSession, resourceC)
    await fetchAndCheckResource(charlieSession, resourceC)
  })

  it("No error occurs when a sharer extends the sharing group of the resource C with the same multiple users", async() => {
    await fetchAndCheckResource(aliceSession, resourceC)
    await fetchAndCheckResource(bobSession, resourceC)
    await fetchAndCheckResource(charlieSession, resourceC)

    let errorOccurred = {isTrue: false}
    try {
      await daveSession.Resource.get(resourceC.resource.id)
    }
    catch(err) {
      checkResourceNotFoundError(err, resourceC.resource.id, errorOccurred)
    }
    expect(errorOccurred.isTrue).to.be.true

    await aliceSession.Resource.extendSharingGroup(resourceC.resource.id,
      [bob.login, charlie.login, dave.login])

    await fetchAndCheckResource(aliceSession, resourceC)
    await fetchAndCheckResource(bobSession, resourceC)
    await fetchAndCheckResource(charlieSession, resourceC)
    await fetchAndCheckResource(daveSession, resourceC)
  })

  it('No error occurs when a sharer adds himself to the sharing group of the resource C', async() => {
    await fetchAndCheckResource(aliceSession, resourceC)
    
    await aliceSession.Resource.extendSharingGroup(resourceC.resource.id,
      [alice.login])

    await fetchAndCheckResource(aliceSession, resourceC)
  })

  it('An identity cannot add himself to the sharers of an inexisting resource',
      async() => {
    for (let i = 0; i < 2; i++) {
      let errorOccurred = {isTrue: false}
      try {
        await aliceSession.Resource.get(randomResourceId)
      }
      catch(err) {
        let randomResourceIdLong = new Long(randomResourceId, 0, true)
        checkResourceNotFoundError(err, randomResourceIdLong, errorOccurred)
      }
      expect(errorOccurred.isTrue).to.be.true
    }

    for (let i = 0; i < 2; i++) {
      let errorOccurred = {isTrue: false}
      try {
        await aliceSession.Resource.get(randomResourceIdLong)
      }
      catch(err) {
        checkResourceNotFoundError(err, randomResourceIdLong, errorOccurred)
      }
      expect(errorOccurred.isTrue).to.be.true
    }
  })
});