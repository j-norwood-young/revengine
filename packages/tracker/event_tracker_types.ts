export interface EventTrackerMessage {
    index: string;
    action: string;
    time: string;
    url: string;
    referer?: string;
    signed_in: boolean;
    user_agent: string;
    browser_id: string;
    user_ip: string;
    user_id?: number;
    user_labels?: string[];
    user_segments?: string[];
    derived_ua_browser: string;
    derived_ua_browser_version: string;
    derived_ua_device: string;
    derived_ua_os: string;
    derived_referer_medium: string;
    derived_referer_source: string;
    post_id?: string;
    post_type?: string;
    sections?: string;
    tags?: string;
    date_published?: string;
    author_id?: string;
}