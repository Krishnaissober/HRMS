warning: in the working copy of 'next-env.d.ts', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/next-env.d.ts b/next-env.d.ts[m
[1mindex 830fb59..ce4e94a 100644[m
[1m--- a/next-env.d.ts[m
[1m+++ b/next-env.d.ts[m
[36m@@ -1,6 +1,7 @@[m
 /// <reference types="next" />[m
 /// <reference types="next/image-types/global" />[m
[31m-/// <reference path="./.next/types/routes.d.ts" />[m
[32m+[m[32mimport "./.next/types/routes.d.ts";[m
[32m+[m[32mimport "./.next/types/root-params.d.ts";[m
 [m
 // NOTE: This file should not be edited[m
 // see https://nextjs.org/docs/app/api-reference/config/typescript for more information.[m
