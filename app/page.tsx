import SalesOverview from "@/modules/commerce/presentation/sales-overview";
import SiteHealth from "@/modules/storefront/presentation/site-health";
import Activity from "@/modules/campaign/presentation/activity";
import CustomerLookup from "@/modules/campaign/presentation/customer-lookup";
export default function OverviewPage() { return <><SalesOverview/><SiteHealth/><Activity/><CustomerLookup/></>; }
