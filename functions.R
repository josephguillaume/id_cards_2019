

process_redirects <- function(statements){
  redirects=filter(statements,predicate=="redirect to")
  for(i in seq_len(nrow(redirects))){
    rename_from=redirects$subject[i]
    rename_to=redirects$object[i]
    statements <- mutate(statements,
                         subject=ifelse(subject==rename_from,rename_to,subject),
                         object=ifelse(object==rename_from,rename_to,object)
    )
  }
  statements <- filter(statements,predicate!="redirect to")
}


# library(httr)
# library(memoise)
# library(jsonlite)
# fetch_annotations_actual<-function(document,authorization){
#   cat("Fetching ",document,"\n")
#   GET(str_glue("https://hypothes.is/api/search?limit=50&url={URLencode(document)}"),
#       add_headers("authorization"=authorization)) %>% 
#     content(simplifyVector=T)
# }
#if(!is.memoised("fetch_annotations")) fetch_annotations <- memoise(fetch_annotations_actual)
fetch_annotations <- function(document,authorization){readRDS("hypothesis.rds")}
