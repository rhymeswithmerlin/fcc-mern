import mongodb from "mongodb";
// import { ObjectId } from "bson";
const  ObjectId = mongodb.ObjectID

let restaurants



export default class RestaurantsDAO {
    static async injectDB(conn) {
        if (restaurants) {
            return;
        }

        try {
            restaurants = await conn.db(process.env.RESTREVIEWS_NS).collection("restaurants")
        } catch (e) {
            console.error(`Unable to establish a collection handle in restaurants DAO: ${e}`)
        }
    }


    // construct query
    // use query to get cursor: data.find(query)
    // refine cursor results to only display the current page
    // return array of results and number of results
    // catch errors
    
    static async getRestaurants({
        filters = null,
        page = 0,
        restaurantsPerPage = 20
    } = {}) {
        let query
        if (filters) {
            if ("name" in filters) {
                query = { $text: { $search: filters["name"]}}
            } else if ("cuisine" in filters) {
                query = {"cuisine": { $eq: filters["cuisine"]}}
            } else if ("zipcode" in filters) {
                query = {"address.zipcode": { $eq: filters["zipcode"]}}
            }
        }

        let cursor

        try {
            cursor =  await restaurants.find(query)

        } catch (e) {
            console.error(`Unable to issue find command, ${e}`)
        }

        const displayCursor = cursor.limit(restaurantsPerPage).skip(restaurantsPerPage * page)

        try {
            const restaurantsList = await displayCursor.toArray()
            const totalNumRestaurants = restaurants.countDocuments(query)

            return {restaurantsList, totalNumRestaurants}
        } catch (e) {
            console.error(`Unable to convert cursor to array or problems counting documents ${e}`)
            return {restaurantsList: [], totalNumberRestaurants: 0}
        }

    }

    static async getRestaurantById(id) {
        try {
            const pipeline = [
                {
                    $match: {
                        _id: new ObjectId(id)
                    }
                },
                // from the reviews collection, we are going to create this pipeline that will match the restaurant id and we will find all reviews that match that restaurant id
                {
                    $lookup: {
                        from: "reviews",
                        let: {
                            id: "$_id"
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$restaurant_id", "$$id"]
                                    }
                                }
                            },{
                                $sort: {
                                    date: -1,
                                }
                            }
                        ], as: "reviews"
                    }
                },
                {$addFields: {
                    reviews: "$reviews"
                }}
            ]
            return await restaurants.aggregate(pipeline).next()
        } catch (e) {
            console.error(`Something went wrong in getRestaurantsById: ${e}`)
            throw e
        }
    }

    static async getCuisines() {
        let cuisines = []
        try {
            cuisines = await restaurants.distinct("cuisine")
            return cuisines
        } catch (e) {
            console.error(`Unable to get cuisines, ${e}`)
            return cuisines
        }
    }
}