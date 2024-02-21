export type TInteraction = {
    uid: string;
    day: Date;
    email: string;
    reader_id: string;
    web_count: number;
    sailthru_blast_open_count: number;
    sailthru_blast_click_count: number;
    sailthru_transactional_open_count: number;
    sailthru_transactional_click_count: number;
    touchbasepro_open_count: number;
    quicket_open_count: number;
    count: number;
    insider: boolean;
    monthly_value: number;
};