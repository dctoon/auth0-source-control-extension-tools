const expect = require('expect');
const Promise = require('bluebird');

const rulesConfigs = require('../../src/auth0/rulesConfigs');

describe('#rulesConfigs', () => {
  let auth0;
  let progress;
  let updateFilters;
  let updatePayloads;

  const rulesConfigsPayload = {
    foo: 'val',
    bar: 'secret'
  };

  const existingRulesConfigs = [
    {
      key: 'foo'
    },
    {
      key: 'to-delete'
    }
  ];

  beforeEach(() => {
    auth0 = {
      rulesConfigs: {
        set(filter, payload) {
          updateFilters.push(filter);
          updatePayloads.push(payload);
          return Promise.resolve();
        },
        delete(filter, payload) {
          updateFilters.push(filter);
          updatePayloads.push(payload);
          return Promise.resolve();
        },
        getAll() {
          return Promise.resolve(
            existingRulesConfigs
          );
        }
      }
    };
    updateFilters = [ ];
    updatePayloads = [ ];
    progress = {
      log: () => { },
      date: new Date(),
      connectionsUpdated: 0,
      rulesConfigsUpserted: 0,
      rulesConfigsDeleted: 0,
      error: null
    };
  });

  describe('#getRulesConfigs', () => {
    it('should return cached rules', (done) => {
      progress.rulesConfigs = [ 'foo', 'to-delete' ];

      rulesConfigs.getRulesConfigs(progress)
        .then((records) => {
          expect(records).toEqual([ 'foo', 'to-delete' ]);
          done();
        });
    });

    it('should call auth0 and get the rules configs', (done) => {
      rulesConfigs.getRulesConfigs(progress, auth0)
        .then((records) => {
          expect(records).toEqual([ 'foo', 'to-delete' ]);
          done();
        });
    });
  });

  describe('#deleteRulesConfigs', () => {
    it('should not run if the rule config also exists in the repository', (done) => {
      progress.rulesConfigs = [ 'foo' ];
      rulesConfigs.deleteRulesConfigs(progress, auth0, rulesConfigsPayload)
        .then(() => {
          expect(progress.rulesConfigsDeleted).toNotExist();
          done();
        });
    });

    it('should delete rules that are not in the repository', (done) => {
      rulesConfigs.deleteRulesConfigs(progress, auth0, rulesConfigsPayload)
        .then(() => {
          expect(progress.rulesConfigsDeleted).toEqual(1);
          expect(updateFilters[0].key).toEqual('to-delete');
          done();
        });
    });
  });

  describe('#upsertRulesConfigs', () => {
    it('should not run if the repository does not contain any rules configs', (done) => {
      rulesConfigs.upsertRulesConfigs(progress, auth0, {})
        .then(() => {
          expect(progress.rulesConfigsUpserted).toNotExist();
          done();
        });
    });

    it('should upsert the rules configs correctly', (done) => {
      rulesConfigs.upsertRulesConfigs(progress, auth0, rulesConfigsPayload)
        .then(() => {
          expect(updateFilters[0]).toExist();
          expect(updateFilters[0].key).toEqual('foo');
          expect(updatePayloads[0]).toExist();
          expect(updatePayloads[0].value).toEqual('val');

          expect(updateFilters[1]).toExist();
          expect(updateFilters[1].key).toEqual('bar');
          expect(updatePayloads[1]).toExist();
          expect(updatePayloads[1].value).toEqual('secret');

          expect(progress.rulesConfigsUpserted).toEqual(2);

          done();
        });
    });
  });
});
