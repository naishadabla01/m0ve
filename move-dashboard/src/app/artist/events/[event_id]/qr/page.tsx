import SearchParamsWrapper from "@/components/SearchParamsWrapper";
   import PageClient from "./PageClient";

   export default function Page() {
     return (
       <SearchParamsWrapper>
         <PageClient />
       </SearchParamsWrapper>
     );
   }