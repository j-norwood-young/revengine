// import OrganisationEdit from "../components/OrganisationEdit.vue";
// import OrganisationEditAbout from "../components/OrganisationEditAbout.vue";
// import OrganisationEditMembers from "../components/OrganisationEditMembers.vue";
// import MemberEdit from "../components/MemberEdit.vue";
// import MemberEditProperties from "../components/MemberEditProperties.vue";
// import Noticeboard from "../components/Noticeboard.vue";
import EditorialDashboard from "../components/EditorialDashboard.vue";

const routes = [
    { path: "/report/editorial_dashboard", name: "EditorialDashboard", component: EditorialDashboard },
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