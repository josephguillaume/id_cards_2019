
print_and_filter<-function(statements2,target_subject,target_predicate,depth){
  wanted <- filter(statements2,subject==target_subject,predicate==target_predicate) %>% pluck("object")
  statements2 <- filter(statements2,!(subject==target_subject & predicate==target_predicate))
  if(length(wanted)>0){
    heading0=paste0(strrep(" ",depth*2),"* ")
    heading1=paste0(strrep(" ",(depth+1)*2),"* ")
    cat(str_glue("\n\n{heading0}{target_predicate}\n\n"))
    cat(paste0(heading1,wanted),sep="\n")
  }
  return(statements2)
}


print_and_filter_subgroup <-  function(statements2,target_subject,target_predicate,depth) {
  subgroups <-filter(statements2, subject == target_subject, predicate == target_predicate)
  statements2 <- filter(statements2,!(subject == target_subject & predicate == target_predicate))
  heading0=paste0(strrep(" ",depth*2),"* ")
  heading1=paste0(strrep(" ",(depth+1)*2),"* ")
  if (nrow(subgroups) > 0)
    cat(str_glue("\n\n{heading0}{target_predicate}\n\n"))  # single newlines are removed
  for (s in seq_len(nrow(subgroups))) {
    subgroup = subgroups$object[s]
    str_glue("{heading1} {subgroup}\n\n") %>% cat
    statements2 <- display(statements2, subgroup, depth + 2)
  }
  return(statements2)
}

display <- function(statements2,target_subject,depth=0){
  for(p in names(display_predicates_used)){
    statements2 <- get(display_predicates_used[p])(statements2,target_subject,p,depth)
  }
  return(statements2)
}
