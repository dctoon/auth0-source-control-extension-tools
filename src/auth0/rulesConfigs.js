const _ = require('lodash');
const Promise = require('bluebird');
const constants = require('../constants');
const apiCall = require('./apiCall');

/*
 * Get all rules configs.
 */
const getRulesConfigs = function(progress, client) {
  if (progress.rulesConfigs) {
    return Promise.resolve(progress.rulesConfigs);
  }

  return apiCall(client, client.rulesConfigs.getAll)
    .then(function(rulesConfigs) {
      progress.rulesConfigs = _.map(rulesConfigs, 'key');
      return progress.rulesConfigs;
    });
};

/*
 * Delete a rule config.
 */
const deleteRulesConfig = function(progress, client, rulesConfigs, existingRulesConfigKey) {
  const ruleConfigExists = _.includes(_.keys(rulesConfigs), existingRulesConfigKey);
  if (ruleConfigExists) {
    return Promise.resolve(true);
  }

  progress.rulesConfigsDeleted += 1;
  progress.log('Deleting rule config ' + existingRulesConfigKey);
  return apiCall(client, client.rulesConfigs.delete, [ { key: existingRulesConfigKey } ]);
};

/*
 * Delete all rules configs that not exist in the new rulesConfigs.
 */
const deleteRulesConfigs = function(progress, client, rulesConfigs) {
  progress.log('Deleting rules configs that no longer exist in the repository...');

  return getRulesConfigs(progress, client)
    .then(function(existingRulesConfigs) {
      progress.log('Existing rules configs: ' + _.join(existingRulesConfigs, ', '));

      return Promise.map(
        existingRulesConfigs,
        function(ruleConfig) {
          return deleteRulesConfig(progress, client, rulesConfigs, ruleConfig);
        },
        { concurrency: constants.CONCURRENT_CALLS });
    });
};

/*
 * Upsert Rules Config.
 */
const upsertRulesConfig = function(progress, client, rulesConfig) {
  var params = { key: rulesConfig.key };
  var data = { value: rulesConfig.value };

  progress.log('Insert or Update ' + rulesConfig.name);
  progress.rulesConfigsUpserted += 1;

  return apiCall(client, client.rulesConfigs.set, [ params, data ]);
};

/*
 * Upsert all Rules Configs.
 */
const upsertRulesConfigs = function(progress, client, rulesConfigs) {
  const ruleConfigKeys = _.keys(rulesConfigs);
  if (ruleConfigKeys.length === 0) {
    return Promise.resolve(true);
  }

  progress.log('Insert or Update rules configs...');

  return Promise.map(_.keys(rulesConfigs), function(rulesConfigKey) {
    var config = {
      key: rulesConfigKey,
      value: rulesConfigs[rulesConfigKey]
    };

    return upsertRulesConfig(progress, client, config);
  }, {
    concurrency: constants.CONCURRENT_CALLS
  });
};

module.exports = {
  getRulesConfigs: getRulesConfigs,
  deleteRulesConfigs: deleteRulesConfigs,
  upsertRulesConfigs: upsertRulesConfigs
};
