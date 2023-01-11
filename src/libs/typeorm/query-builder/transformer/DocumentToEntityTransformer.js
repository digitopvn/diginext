"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentToEntityTransformer = void 0;
/**
 * Transforms raw document into entity object.
 * Entity is constructed based on its entity metadata.
 */
class DocumentToEntityTransformer {
    constructor(
    // private selectionMap: AliasMap,
    // private joinMappings: JoinMapping[],
    // private relationCountMetas: RelationCountAttribute[],
    // private enableRelationIdValues: boolean = false,
    entityClassOrName) {
        // console.dir(entityClassOrName)
        this.entity = entityClassOrName;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    transformAll(documents, metadata) {
        return documents.map((document) => this.transform(document, metadata));
    }
    transform(document, metadata) {
        const entity = metadata.create(undefined, {
            fromDeserializer: true,
        });
        // const Entity = this.entity;
        // const entity = new Entity({a:1})
        let hasData = false;
        // handle _id property the special way
        // if (metadata.objectIdColumn?.propertyName)
        //     console.dir(metadata.objectIdColumn?.propertyName)
        if (metadata.objectIdColumn &&
            document[metadata.objectIdColumn.databaseNameWithoutPrefixes]) {
            // todo: we can't use driver in this class
            // do we really need prepare hydrated value here? If no then no problem. If yes then think maybe prepareHydratedValue process should be extracted out of driver class?
            // entity[metadata.objectIdColumn.propertyName] = this.driver.prepareHydratedValue(document[metadata.objectIdColumn.name"], metadata.objectIdColumn);
            entity[metadata.objectIdColumn.propertyName] =
                document[metadata.objectIdColumn.databaseNameWithoutPrefixes];
            hasData = true;
        }
        // console.dir(metadata.ownColumns, { depth: null })
        // add special columns that contains relation ids
        // if (this.enableRelationIdValues) {
        //     metadata.columns
        //         .filter((column) => !!column.relationMetadata)
        //         .forEach((column) => {
        //             const valueInObject =
        //                 document[column.databaseNameWithoutPrefixes]
        //             if (
        //                 valueInObject !== undefined &&
        //                 valueInObject !== null &&
        //                 column.propertyName
        //             ) {
        //                 // todo: we can't use driver in this class
        //                 // const value = this.driver.prepareHydratedValue(valueInObject, column);
        //                 entity[column.propertyName] = valueInObject
        //                 hasData = true
        //             }
        //         })
        // }
        // console.log("metadata.embeddeds >>>")
        // console.dir(metadata.embeddeds, { depth: null })
        /*this.joinMappings
            .filter(joinMapping => joinMapping.parentName === alias.name && !joinMapping.alias.relationOwnerSelection && joinMapping.alias.target)
            .map(joinMapping => {
                const relatedEntities = this.transformRawResultsGroup(rawSqlResults, joinMapping.alias);
                const isResultArray = joinMapping.isMany;
                const result = !isResultArray ? relatedEntities[0] : relatedEntities;

                if (result && (!isResultArray || result.length > 0)) {
                    entity[joinMapping.propertyName] = result;
                    hasData = true;
                }
            });*/
        // get value from columns selections and put them into object
        metadata.ownColumns.forEach((column) => {
            // const valueInObject = document[column.databaseNameWithoutPrefixes]
            const valueInObject = document[column.propertyName];
            if (valueInObject !== undefined &&
                column.propertyName &&
                !column.isVirtual) {
                // const value = this.driver.prepareHydratedValue(valueInObject, column);
                entity[column.propertyName] = valueInObject;
                // if(column.databaseName != column.propertyName)
                hasData = true;
            }
        });
        const addEmbeddedValuesRecursively = (entity, document, embeddeds) => {
            embeddeds.forEach((embedded) => {
                if (!document[embedded.prefix])
                    return;
                if (embedded.isArray) {
                    entity[embedded.propertyName] = document[embedded.prefix].map((subValue, index) => {
                        const newItem = embedded.create({
                            fromDeserializer: true,
                        });
                        embedded.columns.forEach((column) => {
                            newItem[column.propertyName] =
                                subValue[column.databaseNameWithoutPrefixes];
                        });
                        addEmbeddedValuesRecursively(newItem, document[embedded.prefix][index], embedded.embeddeds);
                        return newItem;
                    });
                }
                else {
                    if (embedded.embeddeds.length &&
                        !entity[embedded.propertyName])
                        entity[embedded.propertyName] = embedded.create({
                            fromDeserializer: true,
                        });
                    embedded.columns.forEach((column) => {
                        const value = document[embedded.prefix][column.databaseNameWithoutPrefixes];
                        if (value === undefined)
                            return;
                        if (!entity[embedded.propertyName])
                            entity[embedded.propertyName] = embedded.create({
                                fromDeserializer: true,
                            });
                        entity[embedded.propertyName][column.propertyName] =
                            value;
                    });
                    addEmbeddedValuesRecursively(entity[embedded.propertyName], document[embedded.prefix], embedded.embeddeds);
                }
            });
        };
        addEmbeddedValuesRecursively(entity, document, metadata.embeddeds);
        // if relation is loaded then go into it recursively and transform its values too
        // console.dir(metadata.relations, { depth: null })
        /*metadata.relations.forEach(relation => {
            const relationAlias = this.selectionMap.findSelectionByParent(alias.name, relation.propertyName);
            if (relationAlias) {
                const joinMapping = this.joinMappings.find(joinMapping => joinMapping.type === "join" && joinMapping.alias === relationAlias);
                const relatedEntities = this.transformRawResultsGroup(rawSqlResults, relationAlias);
                const isResultArray = relation.isManyToMany || relation.isOneToMany;
                const result = !isResultArray ? relatedEntities[0] : relatedEntities;

                if (result) {
                    let propertyName = relation.propertyName;
                    if (joinMapping) {
                        propertyName = joinMapping.propertyName;
                    }

                    if (relation.isLazy) {
                        entity["__" + propertyName + "__"] = result;
                    } else {
                        entity[propertyName] = result;
                    }

                    if (!isResultArray || result.length > 0)
                        hasData = true;
                }
            }

            // if relation has id field then relation id/ids to that field.
            if (relation.isManyToMany) {
                if (relationAlias) {
                    const ids: any[] = [];
                    const joinMapping = this.joinMappings.find(joinMapping => joinMapping.type === "relationId" && joinMapping.alias === relationAlias);

                    if (relation.idField || joinMapping) {
                        const propertyName = joinMapping ? joinMapping.propertyName : relation.idField as string;
                        const junctionMetadata = relation.junctionEntityMetadata;
                        const columnName = relation.isOwning ? junctionMetadata.columns[1].name : junctionMetadata.columns[0].name;

                        rawSqlResults.forEach(results => {
                            if (relationAlias) {
                                const resultsKey = relationAlias.name + "_" + columnName;
                                const value = this.driver.prepareHydratedValue(results[resultsKey], relation.referencedColumn);
                                if (value !== undefined && value !== null)
                                    ids.push(value);
                            }
                        });

                        if (ids && ids.length)
                            entity[propertyName] = ids;
                    }
                }
            } else if (relation.idField) {
                const relationName = relation.name;
                entity[relation.idField] = this.driver.prepareHydratedValue(rawSqlResults[0][alias.name + "_" + relationName], relation.referencedColumn);
            }

            // if relation counter
            this.relationCountMetas.forEach(joinMeta => {
                if (joinMeta.alias === relationAlias) {
                    // console.log("relation count was found for relation: ", relation);
                    // joinMeta.entity = entity;
                    joinMeta.entities.push({ entity: entity, metadata: metadata });
                    // console.log(joinMeta);
                    // console.log("---------------------");
                }
            });
        });*/
        return hasData ? entity : null;
    }
}
exports.DocumentToEntityTransformer = DocumentToEntityTransformer;

//# sourceMappingURL=DocumentToEntityTransformer.js.map
