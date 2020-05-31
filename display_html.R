
html_and_filter<-function(statements2,target_subject,target_predicate,...){
  wanted <- filter(statements2,subject==target_subject,predicate==target_predicate) %>% pluck("object")
  wanted_text <- filter(statements2,subject==target_subject,predicate==target_predicate) %>% pluck("text")
  wanted_link <- filter(statements2,subject==target_subject,predicate==target_predicate) %>% pluck("link")
  statements2 <- filter(statements2,!(subject==target_subject & predicate==target_predicate))
  if(length(wanted)>0){
    cat(str_glue("\n\n<li><span class=predicate>{target_predicate}</span>\n<ul>\n\n"))
    cat(str_glue("<li title='{documentName}: {wanted_text}'><a href='{wanted_link}' target='_new'>{wanted}</a></li>"),sep="\n")
    cat("</ul></li>\n")
  }
  return(statements2)
}


html_and_filter_subgroup <-  function(statements2,target_subject,target_predicate,...) {
  subgroups <-filter(statements2, subject == target_subject, predicate == target_predicate)
  statements2 <- filter(statements2,!(subject == target_subject & predicate == target_predicate))
  if (nrow(subgroups) > 0){
    cat(str_glue("\n\n<li><span class=predicate>{target_predicate}</span>\n<ul>\n\n"))
    for (s in seq_len(nrow(subgroups))) {
      subgroup = subgroups$object[s]
      subgroup_text = subgroups$text[s]
      subgroup_link = subgroups$link[s]
      cat(str_glue("<li><span title='{documentName}: {subgroup_text}'><a href='{subgroup_link}' target='_new'>{subgroup}</a></span>\n\n"))
      statements2 <- display_html(statements2, subgroup, depth + 2)
      cat("</li>\n")
    }
    cat("</ul></li>\n")
  }
  return(statements2)
}

display_html <- function(statements2,target_subject,depth=0){
  # TODO: more robust testing that nothing will be printed within the div
  relevant_statements <- filter(statements2,subject==target_subject)
  if(nrow(relevant_statements)==0) return(statements2)
  
  cat("<div><ul>\n")
  for(p in names(html_predicates_used)){
    statements2 <- get(html_predicates_used[p])(statements2,target_subject,p,depth)
  }
  cat("</ul></div>\n")
  return(statements2)
}

