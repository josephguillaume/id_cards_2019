library(magrittr)
library(dplyr) #version 0.8.4
library(stringr)
library(purrr)
library(readr)
source("functions.R")
source("display_text.R")
source("display_html.R")

documentName="10 steps"
data <- fetch_annotations("https://www.sciencedirect.com/science/article/pii/S1364815206000107")
data <- data %>% {.$rows} %>% 
  mutate(
    annotation=text,
    text=sapply(target,function(t) na.omit(t$selector[[1]]$exact)),
    #TODO: ideally would use link in context, but that doesn't work with via hypothesis
    link=data$rows$links$html
    ) %>% 
  select(annotation,text,link) %>% 
  mutate(position=1:nrow(.))

str_glue("{nrow(data)} annotations") %>% print

statements <- data.frame()
for(i in seq_len(nrow(data))){
  # Split each line with key: value annotations
  annotations <- data$annotation[i] %>% str_split("\n") %>% {.[[1]]} %>% 
    {Filter(function(x) x!="",.)} %>% 
    str_split(": *") %>% 
    lapply(function(x){x[1]=tolower(x[1]);x})

  # Iterate through assertions
  # Subjects and predicates are retained until overridden
  # Dummy predicate used for missing predicates
  # Annotated text is used for missing objects
  subject=NA
  predicate=NA
  for(a in seq_len(length(annotations))){
    if(annotations[[a]][1]=="subject" & !identical(annotations[[a]][2],subject)) {
      subject=annotations[[a]][2] %>% str_trim()
      statements=tribble(
        ~subject,~predicate,~object,
        "text","about",subject
        ) %>% cbind(data[i,]) %>% rbind(statements)
    }
    # 
    if(annotations[[a]][1]=="predicate"){
      if(is.na(subject)) stop("Predicate given without an active subject")
      predicate=annotations[[a]][2] %>% str_trim()
      statements=tribble(
        ~subject,~predicate,~object,
        "text","predicate",predicate
      ) %>% cbind(data[i,]) %>% rbind(statements)
    }
    if(annotations[[a]][1]=="object"){
      if(is.na(subject)) stop("Object given without an active subject")
      if(is.na(predicate)) stop("Object given without an active predicate")
      object=annotations[[a]][2] %>% str_trim()
      statements=tribble(
        ~subject,~predicate,~object,
        subject,predicate,object
      ) %>% cbind(data[i,]) %>% rbind(statements)
    }    
  }
}

# TODO: other text substitutions?
statements <- mutate(statements,object=str_replace_all(object,fixed("$q"),text))


str_glue("{nrow(statements)} statements") %>% print

# If any are available for this text fragment, only keep full statements 
statements2 <- statements %>% group_by(text,position,link) %>% group_map(
  function(x,y) {
    out=x
    if(any(x$subject!="text")) out=filter(out,subject!="text")
    out
  },keep=TRUE
) %>% {do.call(rbind,.)}

# Collapse text nodes with pseudo-predicates
statements2 <- statements2 %>% group_by(text,position,link,annotation) %>% group_map(function(x,y){
  if(!any(x$predicate=="about")) return(cbind(y,x))
  if(!any(x$predicate=="predicate")){
    return(cbind(y,tribble(
      ~subject,~predicate,~object,
      x$object,"topic of",y$text
    )))
  }
  predicate=filter(x,predicate=="predicate") %>% pluck("object")
  subject=filter(x,predicate=="about") %>% pluck("object")
  return(cbind(y,tribble(~subject,~predicate,~object,
                 subject,predicate,y$text
                 )))
}) %>% {do.call(rbind,.)}

statements2 <- process_redirects(statements2)

statements2 <- arrange(statements2,position)

str_glue("{nrow(statements2)} final statements") %>% print

# View(statements2)  

dir.create("out")
write_csv(statements2,"out/statements.csv")


## Display ----

display_predicates_used <-
  c(
    "definition"="print_and_filter",
    "synonym"="print_and_filter",
    "description"="print_and_filter",
    "requires"="print_and_filter",
    "use"="print_and_filter",
    "when to use"="print_and_filter",
    "should be"="print_and_filter",
    "uses"="print_and_filter_subgroup",
    "can use"="print_and_filter_subgroup",
    "has subtask"="print_and_filter_subgroup",
    "has subclass"="print_and_filter_subgroup",
    "reference"="print_and_filter",
    "topic of"="print_and_filter"
  )

sink("out/conceptualisation.txt")
leftover <- display(statements2,"conceptualisation") 
print(leftover)
sink()

leftover %>% filter(predicate %in% names(display_predicates_used)) %>% pluck("subject") %>% unique
leftover$predicate %>% setdiff(names(display_predicates_used) )

# View(leftover)


# HTML ----


html_predicates_used <-
  c(
    "definition"="html_and_filter",
    "synonym"="html_and_filter",
    "description"="html_and_filter",
    "requires"="html_and_filter",
    "use"="html_and_filter",
    "when to use"="html_and_filter",
    "should be"="html_and_filter",
    "uses"="html_and_filter_subgroup",
    "can use"="html_and_filter_subgroup",
    "has subtask"="html_and_filter_subgroup",
    "has subclass"="html_and_filter_subgroup",
    "reference"="html_and_filter",
    "topic of"="html_and_filter"
  )

sink("out/conceptualisation.html")
cat("
<html>
<head>
<style>
    a {
      text-decoration: none;
      color: black;
    }
    div {
      border-style: solid;
      border-width: 1px;
      padding:5px;
      margin-top:10px;
    }
    .predicate {
      font-style: italic;
      color: grey;
    }
</style>
</head>
<body>
Conceptualisation
    ")
leftover <- statements2 %>% 
  filter(predicate %in% names(html_predicates_used)) %>% 
  display_html("conceptualisation") 
cat("</body></html>")
sink()

# TODO: allow editing of annotation
