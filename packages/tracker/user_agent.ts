import Bowser from "bowser";

export const parse_user_agent = function (user_agent) {
    const ua = Bowser.parse(user_agent);
    return {
        user_agent,
        derived_ua_browser: ua.browser.name,
        derived_ua_browser_version: ua.browser.version,
        derived_ua_device: ua.platform.type,
        derived_ua_os: ua.os.name,
        derived_ua_os_version: ua.os.version,
        derived_ua_platform: ua.platform.vendor,
    }
}

export const parse_user_agent_test = function () {
    const user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36";
    const expected = {
        user_agent,
        derived_ua_browser: "Chrome",
        derived_ua_browser_version: "87.0.4280.88",
        derived_ua_device: "desktop",
        derived_ua_os: "macOS",
        derived_ua_os_version: "10.15.7",
        derived_ua_platform: "Apple",
    }
    const actual = parse_user_agent(user_agent);
    console.log(actual);
    console.assert(JSON.stringify(actual) === JSON.stringify(expected));
}

// parse_user_agent_test();