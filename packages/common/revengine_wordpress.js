import config from 'config'
import dotenv from 'dotenv'
import moment from 'moment'
dotenv.config()

const headers = {
    "Authorization": `Bearer ${process.env.REVENGINE_WORDPRESS_KEY}`,
    "Content-Type": "application/json"
}

const _get_endpoint = async (endpoint, page, per_page, modified_after) => {
    modified_after = modified_after ? moment(modified_after).toISOString() : null;
    const url = `${config.wordpress.revengine_api}/${endpoint}?page=${page}&per_page=${per_page}${modified_after ? `&modified_after=${modified_after}` : ''}`;
    const wpresponse = await fetch(url, { headers })
    if (wpresponse.status !== 200) {
        throw `Error fetching ${endpoint}: ${wpresponse.status} ${wpresponse.statusText}`;
    }
    const json = await wpresponse.json()
    return json
}

const get_articles = async (page = 1, per_page = 10, modified_after) => {
    return _get_endpoint('articles', page, per_page, modified_after)
}

const get_opinions = async (page = 1, per_page = 10, modified_after) => {
    return _get_endpoint('opinions', page, per_page, modified_after)
}

const get_cartoons = async (page = 1, per_page = 10, modified_after) => {
    return _get_endpoint('cartoons', page, per_page, modified_after)
}

const get_featured = async (page = 1, per_page = 10, modified_after) => {
    return _get_endpoint('featured', page, per_page, modified_after)
}

const get_users = async (page = 1, per_page = 10, modified_after) => {
    return _get_endpoint('users', page, per_page, modified_after)
}

const get_woocommerce_orders = async (page = 1, per_page = 10, modified_after) => {
    return _get_endpoint('woocommerce_orders', page, per_page, modified_after)
}

const get_woocommerce_subscriptions = async (page = 1, per_page = 10, modified_after) => {
    return _get_endpoint('woocommerce_subscriptions', page, per_page, modified_after)
}

const get_woocommerce_memberships = async (page = 1, per_page = 10, modified_after) => {
    return _get_endpoint('woocommerce_memberships', page, per_page, modified_after)
}

/**
 * Retrieves a post from the WordPress API based on the given post ID.
 * @param {number} post_id - The Wordpress ID of the post to retrieve.
 * @returns {Promise<Object|null>} - A Promise that resolves to the retrieved post object, or null if an error occurs.
 */
const get_post = async (post_id) => {
    try {
        const url = `${config.wordpress.revengine_api}/post?id=${post_id}`
        const wpresponse = await fetch(url, { headers })
        if (wpresponse.status !== 200) {
            throw `Error fetching article ${url}: ${wpresponse.status} ${wpresponse.statusText}`;
        }
        const json = await wpresponse.json()
        return json
    } catch (error) {
        throw error;
    }
}

export {
    get_articles,
    get_post,
    get_opinions,
    get_cartoons,
    get_featured,
    get_users,
    get_woocommerce_orders,
    get_woocommerce_subscriptions,
    get_woocommerce_memberships
}