import EditorialDashboard from "../components/EditorialDashboard.vue";
import EditorialDashboardJournalist from "../components/EditorialDashboardJournalist.vue";

const routes = [
    { 
        path: "/report/editorial_dashboard", 
        name: "EditorialDashboard", 
        component: EditorialDashboard,
    },
    { 
        path: "/report/editorial_dashboard_mail", 
        name: "EditorialDashboard", 
        component: EditorialDashboard,
    },
    { path: "/report/editorial_dashboard/journalists", name: "EditorialDashboardJournalist", component: EditorialDashboardJournalist },
    // { 
    //     path: "/admin/vedit/organisation/:organisation_id", 
    //     name: "OrganisationEdit", 
    //     component: OrganisationEdit,
    //     children: [
    //         {
    //             path: "",
    //             redirect: "properties"
    //         },
    //         {
    //             path: "properties",
    //             name: "OrganisationEditAbout",
    //             component: OrganisationEditAbout
    //         },
    //         {
    //             path: "members",
    //             name: "OrganisationEditMembers",
    //             component: OrganisationEditMembers
    //         }
    //     ]
    // },
    // { 
    //     path: "/admin/vedit/member/:user_id", 
    //     name: "MemberEdit", 
    //     component: MemberEdit ,
    //     children: [
    //         {
    //             path: "",
    //             redirect: "properties"
    //         },
    //         {
    //             path: "properties",
    //             name: "MemberEditProperties",
    //             component: MemberEditProperties
    //         },
    //     ]
    // },
    // { path: "/noticeboard", name: "Noticeboard", component: Noticeboard },
]

export default routes;