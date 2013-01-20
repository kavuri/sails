var _ = require('underscore');

var normalize = module.exports = {
	// Normalize the different ways of specifying criteria into a uniform object
	criteria: function normalizeCriteria(origCriteria) {
		var criteria = _.clone(origCriteria);

		if(!criteria) return {
			where: null
		};

		// Empty undefined values from criteria object
		_.each(criteria, function(val, key) {
			if(_.isUndefined(val)) delete criteria[key];
		});

		// Convert id and id strings into a criteria
		if((_.isFinite(criteria) || (_.isString(criteria)) && +criteria > 0)) {
			criteria = {
				id: +criteria
			};
		}

		// Return string to indicate an error
		if(!_.isObject(criteria)) throw new Error('Invalid options/criteria :: ' + criteria);

		// If criteria doesn't seem to contain operational keys, assume all the keys are criteria
		if(!criteria.where && !criteria.limit && !criteria.skip && !criteria.sort) {

			// Delete any residuals and then use the remaining keys as attributes in a criteria query
			delete criteria.where;
			delete criteria.limit;
			delete criteria.skip;
			delete criteria.skip;
			criteria = {
				where: criteria
			};
		}
		// If where is null, turn it into an object
		else if(_.isNull(criteria.where)) criteria.where = {};

		// If any item in criteria is a parsable finite number, 
		// search for both the INTEGER and STRING versions
		for(var attrName in criteria.where) {
			if(Math.pow(+criteria.where[attrName], 2) > 0) {
				criteria.where[attrName] = [+criteria.where[attrName], criteria.where[attrName]];
			}
		}

		// If WHERE is {}, always change it back to null
		if(criteria.where && _.keys(criteria.where).length === 0) {
			criteria.where = null;
		}

		// If a LIKE was specified, normalize it
		if(criteria.where && criteria.where.like) {
			_.each(criteria.where.like, function(criterion, attrName) {
				criteria.where.like[attrName] = normalizePercentSigns(criterion);
			});
		}

		// Normalize sort criteria
		if(criteria.sort) {
			// Split string into attr and sortDirection parts (default to 'asc')
			if(_.isString(criteria.sort)) {
				var parts = _.str.words(criteria.sort);
				parts[1] = parts[1] ? parts[1].toLowerCase() : 'asc';
				if(parts.length !== 2 || (parts[1] !== 'asc' && parts[1] !== 'desc')) {
					throw new Error('Invalid sort criteria :: ' + criteria.sort);
				}
				criteria.sort = {};
				criteria.sort[parts[0]] = (parts[1] === 'asc') ? 1 : -1;
			}

			// Verify that user either specified a proper object
			// or provided explicit comparator function
			if(!_.isObject(criteria.sort) && !_.isFunction(criteria.sort)) {
				throw new Error('Invalid sort criteria for ' + attrName + ' :: ' + direction);
			}
		}

		return criteria;
	},

	// Normalize the capitalization and % wildcards in a like query
	// Returns false if criteria is invalid,
	// otherwise returns normalized criteria obj.
	likeCriteria: function normalizeLikeCriteria(criteria, attributes) {

		if(_.isObject(criteria)) {
			if(!criteria.where) criteria = {
				where: criteria
			};
			criteria.where = {
				like: criteria.where
			};

			// Look for and handle % signs
			_.each(criteria.where.like, function(criterion, attrName) {
				criteria.where.like[attrName] = normalizePercentSigns(criterion);
			});
			return criteria;
		}

		// If string criteria is specified, check every attribute for a match
		else if(_.isString(criteria)) {
			var searchTerm = criteria;
			criteria = {
				where: {
					or: []
				}
			};
			_.each(attributes, function(criterion, attrName) {

				// Build individual like query
				var obj = {
					like: {}
				};

				// Look for and handle % signs
				obj.like[attrName] = normalizePercentSigns(searchTerm);

				criteria.where.or.push(obj);
			});

			return criteria;
		} else return false;

	},


	/**
	 * Run a method on an object -OR- each item in an array and return the result
	 * Also handle errors gracefully
	 */
	pluralize: function pluralize(collection, application) {
		if(_.isArray(collection)) {
			return _.map(collection, application);
		} else if(_.isObject(collection)) {
			return application(collection);
		} else {
			throw "Invalid collection passed to plural aggreagator:" + collection;
		}
	}
};




// Given a criteria string inside of a "LIKE" criteria object,
// support the use of % signs to add startsWith and endsWith functionality
function normalizePercentSigns(likeCriterion) {
	// If no % signs are specified, wrap it in %
	if(!likeCriterion.match(/%/)) {
		return '%' + likeCriterion + '%';
	} else return likeCriterion;
}


// Replace % with %%%


function escapeLikeQuery(likeCriterion) {
	return likeCriterion.replace(/[^%]%[^%]/g, '%%%');
}

// Replace %%% with %


function unescapeLikeQuery(likeCriterion) {
	return likeCriterion.replace(/%%%/g, '%');
}