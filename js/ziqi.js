// function pubsShow(id) {
//   if (id == 0) {
//     document.getElementById('pubs').innerHTML = document.getElementById('pubs_selected').innerHTML;
//     document.getElementById('selectedText').style = 'color:#000000;text-decoration:underline';
//     document.getElementById('allText').style = '';
//   } else if (id == 1) {
//     document.getElementById('pubs').innerHTML = document.getElementById('pubs_all').innerHTML;
//     document.getElementById('selectedText').style = '';
//     document.getElementById('allText').style = 'color:#000000;text-decoration:underline;';
//   }
// }

function load_selected() {
  var papers = $("#all-papers-container .pubs");
  $("#pubs_selected").html("");
  var html = "";
  // Map each topic to a html string.
  var topics_html = {
    fairness: "",
    causalinference: "",
  };
  var topics = {
    causalinference: "Causal Inference",
    fairness: "Fairness"
  };
  // Iterate through all the topics.
  for (let k in topics) {
    topics_html[k] += "<h4 style='color: #0B0A55;'>" + topics[k] + "</h4>";
    topics_html[k] += '<table class="table table-hover">';
  }

  // Add the papers to the html string.
  for (var pid = 0; pid < papers.length; pid++) {
    if ($(papers[pid]).attr("paper-select") == "true") {
      var topic = $(papers[pid]).attr("topic");
      topics_html[topic] += "<tr><td>";
      topics_html[topic] += $(papers[pid]).html();
      topics_html[topic] += "</td></tr>";
    }
  }
  // Iterate through all the topics.
  for (let k in topics_html) {
    topics_html[k] += "</table>";
  }
  html += topics_html["causalinference"];
  html += topics_html["fairness"];
  // Add the html string to the page.
  html += "</table>";
  $("#pubs_selected").append(html);
  // Set color.
  $("#pubs_all").hide();
  $("#pubs_selected").show();

  $("#pub-by-date").attr("style", "");
  $("#pub-by-selected").css({
    color: "#000000",
    "text-decoration": "underline",
  });
  // Update the global flag.
  is_selected = true;
  return false;
}

function load_all() {
  var papers = $("#all-papers-container .pubs");
  var html = "";
  $("#pubs_all").html("");
  for (var pid = 0; pid < papers.length; pid++) {
    if (
      pid == 0 ||
      $(papers[pid - 1]).attr("paper-year") != $(papers[pid]).attr("paper-year")
    ) {
      var year = $(papers[pid]).attr("paper-year");
      if (year > 2015)
        html +=
          "<h3 id='year-" + year.toString() + "'>" + year.toString() + "</h3>";
      else
        html +=
          "<h3 id='year-" +
          year.toString() +
          "'>" +
          year.toString() +
          " and Before " +
          "</h3>";
      html += '<table class="table table-hover">';
    }
    html += "<tr><td>";
    html += $(papers[pid]).html();
    html += "</td></tr>";
    if (
      pid == papers.length - 1 ||
      $(papers[pid]).attr("paper-year") != $(papers[pid + 1]).attr("paper-year")
    )
      html += "</table>";
  }
  $("#pubs_all").append(html);
  // Set color.
  $("#pubs_selected").hide();
  $("#pubs_all").show();

  $("#pub-by-selected").attr("style", "");
  $("#pub-by-date").css({ color: "#000000", "text-decoration": "underline" });
  // Update the global flag.
  is_selected = false;
  return false;
}

$("#pub-by-selected").on("click", load_selected);

$("#pub-by-date").on("click", load_all);