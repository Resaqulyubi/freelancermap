// Setup
// var width = 1000;
// var height = 1000;
var width = window.innerWidth;
var height = window.innerHeight;
var data;
var markers = [];
var force, drag, zoom;
var nodeColorScale;
var nodeRadiusScale;
var linkWeightScale;
var linkOpacityScale;
var nfilter = crossfilter(),
    efilter = crossfilter();
var nodesPopDim, edgesWeightDim, trafWeightDim;
var nodesConDim, edgesConDim;
var nodes = [];
var links = [];
var linked = {};
var node, link, nodeLayer, linkLayer, container;
var svg;
var nhabVal = 0,
    tminVal = 1,
    ttrafVal = 1;
var highlightId = -1;
var showArrows = 0,
    showJunctions = 1,
    showSynapses = 1;
var fetched = false;
var dragging = 0;
var arcs = false;
var sqrt3 = 1.7320508075688772;

// For canvas drawing of edges:
// https://chat.stackoverflow.com/rooms/73258/discussion-between-niddro-and-martin-hascak
// https://jsfiddle.net/Klainer/wop1Lfjr/2/
var use_canvas = true;
var canvas;
var context;
var scale = 1;
var transX = 0;
var transY = 0;

var linkOpacityDefault = 0.25;
var linkOpacityBackground = 0.05;
var linkOpacityHighlight = 1;
var nodeOpacityDefault = 1;
var nodeOpacityBackground = 0.1;

var numLinksDrawThresh = 2000;

var shortest_path_flag = false;
var shortest_path_nodes = [];
var shortest_path_endpoints = {'g1_b':null, 'g2_b':null};

var g1_a = [];
var g1_b = [];
var g2_a = [];
var g2_b = [];




var presets = [
    {name: "Salt klinotaxis S", g1:"ASE", g2:"SMB", smin: 2, ttraf: 2, length:3},
    {name: "Salt klinotaxis L", g1:"ASE", g2:"SMB", smin: 1, ttraf: 1, length:3},
    // Piggot thesis, p. 89 A
    {name: "Isothermal tracking", g1:"AFD,AWC", g2:"VB, DB, RMD, RIM, SMD, VA, DA, DD", smin: 1, ttraf: 1, length:2},
    // Piggot thesis, p. 35 A
    {name: "Backward escape", g1:"ASH", g2:"VB, DB, RMD, RIM, SMD, VA, DA, DD", smin: 1, ttraf: 1, length:2}
]

var neuronTypes;
var markmap;

//-------------------------------------------------------------------
// Little helpers
//-------------------------------------------------------------------
function split(val) {
    return val.split( /,\s*/ );
}

function extractLast( term ) {
    return split(term).pop();
}

//-------------------------------------------------------------------
// Group input autocomplete (multiple)
// https://jqueryui.com/autocomplete/#multiple
//-------------------------------------------------------------------
function group_auto(data) {
    var groups = d3.set(data.neurons.map(function(d) { return [d.description_n4, d.id]} ).sort()).values();

    $(function () {
        $("#group1, #group2")
        .bind("keydown", function(event) {
            if (event.keyCode === $.ui.keyCode.TAB && $(this).autocomplete( "instance" ).menu.active) {
              event.preventDefault();
            }
        })
        .autocomplete({
            minLength: 0,
            source: function( request, response ) {
                // delegate back to autocomplete, but extract the last term
                response($.ui.autocomplete.filter(groups, extractLast(request.term)));
            },
            focus: function() { return false; }, // prevent value inserted on focus
            select: function( event, ui ) {
                var terms = split( this.value );
                terms.pop();    // remove the current input
                terms.push( ui.item.value ); // add the selected item
                //terms.push( "" );   // add placeholder to get the comma-and-space at the end
                this.value = terms;//alert(terms); //terms.join( ", " );
                return false;
            }
        });
    });

    // var names = d3.set(data.neurons.map(function(d) { return d.name;} ).sort()).values();
    // $(function () {
    //     $("#search-node").autocomplete({source: names});
    // });

    var description_n4 = d3.set(data.neurons.map(function(d) { return d.description_n4;} ).sort()).values(); //
    $(function () {
        $("#search-description_n4").autocomplete({source: description_n4});
    });


    // var modalities = data.neurons
    //     .filter(function(x) { return "modalities" in x; })
    //     .map(function(d) { return d.modalities.split(", "); });
    //     // console.log(modalities)
    // modalities = [].concat.apply([], modalities).sort(); // flatten array
    // modalities = d3.set(modalities).values();

    var modalities = d3.set(data.neurons.map(function(d) { return [d.description_n4, d.id]} ).sort()).values();
    $(function () {
        $("#rec-sel")
        .bind("keydown", function(event) {
            if (event.keyCode === $.ui.keyCode.TAB && $(this).autocomplete( "instance" ).menu.active) {
              event.preventDefault();
            }
        })
        .autocomplete({
            minLength: 0,
            source: function( request, response ) {
                response($.ui.autocomplete.filter(modalities, extractLast(request.term)));
            },
            focus: function() { return false; }, // prevent value inserted on focus
            select: function( event, ui ) {
                var terms = split( this.value );
                terms.pop();    // remove the current input
                terms.push( ui.item.value ); // add the selected item
                terms.push( "" );   // add placeholder to get the comma-and-space at the end
                this.value = terms.join( ", " );
                return false;
            }
        });
    });
}


//-------------------------------------------------------------------
// Grap with d3
//-------------------------------------------------------------------
function translateSVG() {
    
    var viewBoxLeft = document.querySelector("svg#lucu").viewBox.animVal.x;
    var viewBoxTop = document.querySelector("svg#lucu").viewBox.animVal.y;
    // Reszing width and height incase of window resize
    svg.attr("width", window.innerWidth)
    svg.attr("height", window.innerHeight)
      // Adding the ViewBox attribute to our SVG to contain it
    // svg.attr("viewBox", function() {
    //   return "" + viewBoxLeft + " " + viewBoxTop + " " + window.innerWidth + " " + window.innerHeight;
    // });
    // Adding the style attribute to our SVG to transkate it
    var haha = document.querySelector("canvas");
    svg.attr("style", function() {
      return "overflow: overlay;" + "transform: translate3d(" + viewBoxLeft + "px, " + viewBoxTop + "px, 0px);";
    });
    haha.style.overflow="overlay"
    haha.style.transform="transform: translate3d(" + viewBoxLeft + "px, " + viewBoxTop + "px, 0px);"
    // context.translate(viewBoxLeft,viewBoxTop)
    // haha.style.transform=document.querySelector(".leaflet-map-pane").style.transform.replace("-","")
    // haha.setAttribute("viewBox","" + viewBoxLeft + " " + viewBoxTop + " " + window.innerWidth + " " + window.innerHeight)
    // haha.width=window.innerWidth
    // haha.height=window.innerHeight
    // context.scale(width,height)
    // context.translate(viewBoxLeft,viewBoxTop)
    // haha.style="overflow: overlay;" + "transform: translate3d(" + viewBoxLeft + "px, " + viewBoxTop + "px, 0px);";
    

}
// map.on("viewreset",function(){
    
//     if(force!==undefined){
//         // translateSVG()
        
//         node.attr("transform", function (d) {
//             var tx = Math.round(d.x); var ty = Math.round(d.y);
//             const ha=map.latLngToLayerPoint([d.lat,d.long]);
//             d.x=ha.x
//             d.y=ha.y
//               if(!isNaN(d.x))
//                   return "translate(" + ha.x + "," + ha.y + ")";
//               else
//                   // see which nodes are giving you an error
//                   //console.log(d)
//                   return "translate(0,0)";
//               })
//             //   drawCanvas()
            
//     // context.save();
//     drawCanvas()
//     }
// })
map.on("zoom",function(){
    if(force!==undefined){
        translateSVG()
        
        node.attr("transform", function (d) {
            var tx = Math.round(d.x); var ty = Math.round(d.y);
            const ha=map.latLngToLayerPoint([d.lat,d.long]);
            d.x=ha.x
            d.y=ha.y
              if(!isNaN(d.x))
                  return "translate(" + ha.x + "," + ha.y + ")";
              else
                  // see which nodes are giving you an error
                  //console.log(d)
                  return "translate(0,0)";
              })
              drawCanvas()
            
    // context.save();
    // drawCanvas()
    }
})
map.on("move",function(){
    // console.log("sd")
    if(force!==undefined){
        translateSVG()
        // drawCanvas()
        
    
        node.attr("transform", function (d) {
            var tx = Math.round(d.x); var ty = Math.round(d.y);
            const ha=map.latLngToLayerPoint([d.lat,d.long]);
            d.x=ha.x
            d.y=ha.y
              if(!isNaN(d.x))
                  return "translate(" + ha.x + "," + ha.y + ")";
              else
                  // see which nodes are giving you an error
                  //console.log(d)
                  return "translate(0,0)";
              })
              
              drawCanvas()
    }
    
    // d3.selectAll("circle")
  })
graph = function(id, d, canvas) {
    
    data = d;
// console.log(data.neurons[0])
    use_canvas = canvas;
    neuronTypes = d3.set(data.neurons.map(function(d) { return d.type;} ).sort()).values();

    zoom = d3.behavior.zoom().scaleExtent([0.25, 4]).on("zoom", zoomed);
    // var slap=map.getPixelBounds()
    d3.select(map.getPanes().overlayPane).append("div")
    .attr("id","flo")
    .attr("style","overflow:overlay;")
    // Containers
    if (use_canvas) {
        canvas = d3.select("#flo").insert("canvas", id)
            .attr("width", width)
            .attr("height", height)
            .style("position", "absolute");

        context = canvas.node().getContext("2d");
        
        canvas.call(zoom).on("dblclick.zoom", null);
    }
    // d3.select(map.getPanes().overlayPane).append("div")
    
    // map._initPathRoot()  
    // svg=d3.select(id)
    svg = d3.select(map.getPanes().overlayPane)
    .append("svg").attr("id","lucu")
    // svg = d3.select(id).append("svg")
    
        // .attr("viewBox", "0 0 " + width + " " + height)
        //.attr("preserveAspectRatio", "xMidYMid meet")
        .attr("width", width)
        .attr("height", height)
        // .attr("class", "leaflet-zoom-hide")
        // .style("left", topLeft.x + "px")
        // .style("top", topLeft.y + "px")
        // .call(zoom).on("dblclick.zoom", null);
        

        // var transform = d3.geo.transform({ point: projectPoint });
        // var path = d3.geo.path().projection(transform);
    container = svg.append("g")
        .attr("style", "cursor:move")
    //     .attr("width", map.getSize().x + "px")
    //     .attr("height", map.getSize().y + "px")
    //     .attr("transform", "translate(" + -topLeft.x + "," + -topLeft.y + ")")
        
    //     ;

    linkLayer = svg.append("g");
    nodeLayer = svg.append("g").attr("class", "leaflet-zoom-hide");
    
    // Scales
    col_sensory = "#ED008C"
    col_motor = "#F5892D"
    col_inter = "#00ADEF"
    col_sensmot = d3.rgb(d3.interpolateRgb(col_sensory, col_motor)(0.5)).brighter(2).toString();
    col_sensint = d3.rgb(d3.interpolateRgb(col_sensory, col_inter)(0.5)).brighter(2).toString();
    col_intmot = d3.rgb(d3.interpolateRgb(col_inter, col_motor)(0.5)).brighter(1).toString();
    //colors = [col_inter, col_sensory, col_motor, col_intmot, col_sensint, col_sensmot, "#bbb"];
    //colors = [col_inter, col_motor, col_intmot, col_sensory, col_sensint, col_sensmot, "#bbb"];
    // colors = [];
    // for (var i = 0; i < 30; i++){
    //     colors[i] = "hsl( " + makeColor(i, 30) + ", 100%, 50% )";
    // }

    colors  = generateRandomColors(30);
    

    nodeColorScale = d3.scale.ordinal().domain(neuronTypes).range(colors);

    var degreeDomain = d3.extent(data.neurons, function(n) { return n.population; });
    nodeRadiusScale = d3.scale.linear().domain(degreeDomain).range([2.8,25]); // Change node size (radio)

    var weightDomain = d3.extent(data.synapses, function(s) { return s.weight; });
    // console.log(weightDomain)
    if (use_canvas) {
        linkWeightScale = d3.scale.linear().domain(weightDomain).range([2,3]); // Change link weight
        linkOpacityScale = d3.scale.linear().domain(weightDomain).range([0.1,0.5]);
    }
    else {
        linkWeightScale = d3.scale.linear().domain(weightDomain).range([1,2]);
    }

    initNodePos(data.neurons);
    addNodeRadius(data.neurons);
    
    // console.log(colors)
    // Build arrows
    svg.append("svg:defs").selectAll("marker").data(colors)      // Different link/path types can be defined here
      .enter().append("svg:marker")    // This section adds in the arrows
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", -0)
        .attr("markerWidth", 2) // CHANGED
        .attr("markerHeight", 2) // CHANGED
        .attr("markerUnits", "userSpaceOnUse")
        .attr("orient", "auto")
        .attr("style", function(d) { return "fill: " + d + "; visibility: visible;"})
            .append("svg:path")
                .attr("d", "M0,-5L10,0L0,5");
// console.log(links)
    // Create force layout
    
    force = d3.layout.force()
        .nodes(nodes)
        .links(links)
        .charge(-30) // -250
        .linkDistance(120)
        .linkStrength(0.5) //0.5
        .friction(0.5)  //0.5
        .gravity(0.7) // 0.3
        .size([width, height])
        .on("tick", tick);
        // console.log(nodes)
    drag = force.drag() // .on("dragstart", dragstarted).on("drag", dragged).on("dragend", dragstopped);
    node = nodeLayer.selectAll(".node");
    // link = linkLayer.selectAll(".link");
    
// console.log(node)
    svg.on("click", function() {
        if (d3.event.defaultPrevented) {
            return;
        }
        toggleSelected(highlightId, false);
        highlightId = -1;
        connectedNodes(null);
        removeNodeInfo();
        d3.event.stopPropagation();

        // if(shortest_path_flag){//when in shortest path mode
        //   subGraph();
        // }
    });

    // Crossfilter
    nfilter.add(data['neurons']);
    efilter.add(data['synapses']);
    
    nodesPopDim = nfilter.dimension(function(d) { return d.population; });
    
    edgesWeightDim = efilter.dimension(function(d) { return d.type != "EJ" ? d.weight : 6666; }); // FILTER WEIGHT
    
    trafWeightDim = efilter.dimension(function(d) { 
        // console.log(d.type)
        return d.type != "EJ" ? d.trafico : 6666;
     });
    // console.log(trafWeightDim)
    // return;
    // return;
    // Set up auto-complete for group inputs
    group_auto(data);
// console.log(data.synapses[0])
    update(data.neurons, data.synapses);
    // filter(nhabVal, tminVal, ttrafVal);

    // Warm-start
    for (i = 0; i < 10; i++)
        force.tick();

    buildAdjacency();
    buildPresets();
    buildLegend();

    d3.select(window).on("resize", resize);
    drawCanvas()
    // var soki = d3.select(map.getPanes().overlayPane).append("svg"),
    // g = soki.append("g").attr("class", "leaflet-zoom-hide");
}


getmapInfo = function(map){

    markmap = map;
}

// function to mark the markers on the map.
markOnMap = function(dat){

console.log(dat.long);
var myOptions = { zoom : 5};
// markmap.setOptions(myOptions);
    //console.log(data.synapses);
    var fnl = [] ;
    var j =0;
    for(var i = 0; i< data.synapses.length ; i++){
    if(data.synapses[i].from == ""+dat.id+""  || data.synapses[i].to == ""+dat.id+"")
        {
            fnl[j] = data.synapses[i];
            j++;
        }
    }
    // console.log(fnl);
    // console.log("TOTL"+j);

    console.log(dat.id);
    var circle = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: 'yellow',
        scale: 10,
        strokeOpacity: 0.0,
        fillOpacity: 1.0,

      };
    for (var j1 = 0; j1< fnl.length ; j1++){

        if(fnl[j1].from == ""+dat.id+""){


            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(fnl[j1].target.lat, fnl[j1].target.long),
                map: markmap,
                // label: fnl[j1].target.description_n4,
                // icon: circle,
                // labelOrigin: new google.maps.Point(9, 0)
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: ''+nodeColorScale(dat.type)+'',
                    scale: 4,
                    strokeOpacity: 0.5,
                    strokeWeight: 2,
                    strokeColor: 'black',
                    fillOpacity: 1.0,
                    origin: new google.maps.Point(0, 0),
                    //anchor: new google.maps.Point(0, 0),
                    labelOrigin: new google.maps.Point(0, 2)
                  },
                  // label: {
                  //   text: fnl[j1].target.description_n4,
                  //   fontWeight: 'bold',
                  //   fontSize: '12px',
                  //   fontFamily: '"Courier New", Courier,Monospace',
                  //   color: 'black'
                  // }
              });
        //    console.log("to:" + fnl[j1].to);
          }
          else if(fnl[j1].to == ""+dat.id+""){
         //   console.log("from:" + fnl[j1].from);


         var marker = new google.maps.Marker({
                position: new google.maps.LatLng(fnl[j1].source.lat, fnl[j1].source.long),
                map: markmap,
                // label:fnl[j1].source.description_n4,
                // icon: circle,
                // labelOrigin: new google.maps.Point(9, 0)
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: ''+nodeColorScale(dat.type)+'',
                    scale: 4,
                    strokeOpacity: 0.5,
                    strokeWeight: 2,
                    strokeColor: 'black',
                    fillOpacity: 1.0,
                    origin: new google.maps.Point(0, 0),
                  //  anchor: new google.maps.Point(0, 0),
                    labelOrigin: new google.maps.Point(0, 2)
                  },
                  // label: {
                  //   text: fnl[j1].target.description_n4,
                  //   fontWeight: 'bold',
                  //   fontSize: '12px',
                  //   fontFamily: '"Courier New", Courier,Monospace',
                  //   color: 'black'
                  // }
              });
          }
          markers.push(marker);
}
var marker = new google.maps.Marker({
    position: new google.maps.LatLng(dat.lat, dat.long),
    map: markmap,
    icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: ''+nodeColorScale(dat.type)+'',
        scale: 4,
        strokeOpacity: 0.5,
        strokeWeight: 1,
        strokeColor: 'black',
        fillOpacity: 1.0,
        origin: new google.maps.Point(0, 0),
      //  anchor: new google.maps.Point(0, 0),
        labelOrigin: new google.maps.Point(0, 1.5)
      },
      // label: {
      //   text: dat.description_n4,
      //   fontWeight: 'bold',
      //   fontSize: '12px',
      //   fontFamily: '"Courier New", Courier,Monospace',
      //   color: 'black'
      // }

  });
  markers.push(marker);

console.log("Markers Len"+markers.length);


}

function setMapOnAll(map) {
    for (var i = 0; i < markers.length; i++) {
      markers[i].setMap(map);
    }
    markers = [];
  }



function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    svg.attr('width', width).attr("height", height);
    document.getElementsByTagName("canvas")[0].width=width
    document.getElementsByTagName("canvas")[0].height=height
    // initNodePos(node)
    // console.log(node)
    force.size([width, height]).resume();
}



function buildLegend() {
    footer = d3.select("#footer").append("svg")
        .attr("height", 215)
        .attr("width", "100%");

    // Color legend
    footer.append("g")
        .attr("class", "legendColor")
        .attr("transform", "translate(4.5,4.5)");

    var legendColor = d3.legend.color()
        .shape("circle")
        .shapeRadius(5)
        .shapePadding(2)
        .orient('vertical')
        .scale(nodeColorScale);

    footer.select(".legendColor").call(legendColor);

    $(".legendColor").find(".cell").on("click", function(){
        var selectedVal = $(this).find('text').text();
        var sel = node.filter(function(d) { return d.group == selectedVal; });
        if(sel[0].length > 0) {
            link.style("opacity", function (o) {
                return 0;
            });

            node.style("opacity", function (o) {

                if (o.group == selectedVal) {
                    //console.log("ok");
                    return nodeOpacityDefault;
                }else{
                    //console.log("no");
                    return nodeOpacityBackground;
                };

            });


            node.on("mouseover", function (o) {
                if (!shortest_path_flag && o.group == selectedVal) {
                    document.getElementById("nodeinfo_footer").innerHTML = htmlTabForNode_1(o);
                }
                else if(shortest_path_flag){ //when in shortest path mode
                  if(shortest_path_nodes.indexOf(o.id) != -1){
                    document.getElementById("nodeinfo_footer").innerHTML = htmlTabForNode_1(o);
                  }
                }
            });

            node.on("mouseout", function (o) {
              if(!shortest_path_flag){
                document.getElementById("nodeinfo_footer").innerHTML = "";
              }
              else if(shortest_path_flag){ //when in shortest path mode
                document.getElementById("nodeinfo_footer").innerHTML = "";
                // subGraph();
              }
            });


        }
    });

    // function searchNode() {
    //     var selectedVal = document.getElementById('search-node').value;
    //     var sel = node.filter(function(d) { return d.name == selectedVal; });
    //     if(sel[0].length > 0) {
    //         //showNodeInfo(sel.data()[0]);
    //         nodeClicked(sel.data()[0]);
    //         connectedNodes(sel.data()[0]);
    //     }
    //     else {
    //         $('#search-node').addClass("alert-danger");
    //     }
    // }


    // Size legend

    // var sleg = footer.append("g")
    //     .attr("transform", "translate(25,320)");
    // sleg.append("text")
    //     .text("Tamaño de la Población")
    // sleg.append("g")
    //     .attr("class", "legendSize")
    //     .attr("transform", "translate(1,40)");
    //
    // var legendSize = d3.legend.size()
    //     .shape('circle')
    //     .shapePadding(3)
    //     .cells([3])
    //     .orient('horizontal')
    //     // .scale(nodeRadiusScale)
    //     .labels(["1K","1M","1MM"]);
    //
    // footer.select(".legendSize").call(legendSize);

    // Line type legend

    // var lleg = footer.append("g")
    //     .attr("transform", "translate(350,20)");
    // lleg.append("text")
    //     .text("Connection type");
    // lleg.append("g")
    //     .attr("class", "legendLine")
    //     .attr("transform", "translate(0,30)");

    // line_solid = "M 0 0 h 20";
    // line_dashed = "M 0 0 h 4 m 2 0 h 4 m 2 0 h 4 m 2 0 h 4";
    // var lineScale = d3.scale.ordinal()
    //     .domain(['Synapse/NMJ', 'EJ'])
    //     .range([line_solid, line_dashed]);

    // var legendLine = d3.legend.symbol()
    //     .scale(lineScale)
    //     .orient("horizontal")
    //     .shapePadding(30)
    //     .labelOffset(20);

    //footer.select(".legendLine").call(legendLine);

    // var lsol = d3.select(".legendLine").append("path")
    //     .attr("d", line_dashed)
    //     .attr("stroke-width", 1)
    //     .attr("stroke", "black")
    //     .attr("fill", "none");

}

function updateCrossFilter(n, s) {
    nodesPopDim.filter(null);
    edgesWeightDim.filter(null);
    trafWeightDim.filter(null);
    nfilter.remove();
    efilter.remove();
    nfilter.add(n);
    efilter.add(s);
    initNodePos(n);
    addNodeRadius(n);
    update([],[]);
    update(n, s);
    filter(nhabVal, tminVal, ttrafVal);

    // Warm-start
    for (i = 0; i < 10; i++)
        force.tick();

    if(use_canvas)
        drawCanvas();
}


function buildPresets() {
    for (var i = 0; i < presets.length; i++) {
        d3.select("#presetList")
            .append("li")
                .attr("role", "presentation")
                .append("a")
                    .attr("href", "#")
                    .attr("id", i)
                    .attr("role", "menuitem")
                    .attr("tabindex", "-1")
                    .text(presets[i]['name']);
    };
}

function applyPreset(id) {
    p = presets[id];
    $("#group1").val(p.g1_b);
    $("#group2").val(p.g2_b);
    setSlider("subw", p.smin);
    setSlider("subj", p.ttraf);
    setSlider("subp", p.length);
}


function buildAdjacency() {
    linked = {}
    nodes.forEach(function (d) { linked[d.id + "," + d.id] = true; });
    links.forEach(function (d) { linked[d.from + "," + d.to] = true; });
}

function neighboring(a, b) {
    return linked[a.id + "," + b.id];
}


function filternhab(nhab) {
    nhabVal = nhab;
    document.querySelector('#nhablabel').value = nhab;
    filter(nhabVal, tminVal, ttrafVal);

}

function filtertmin(tmin) {
    tminVal = tmin;
    document.querySelector('#tminlabel').value = tmin;
    filter(nhabVal, tminVal, ttrafVal);
}

function filterttraf(ttraf) {
    ttrafVal = ttraf;
    document.querySelector('#ttraflabel').value = ttraf;
    filter(nhabVal, tminVal, ttrafVal);
}

function filter(nhab, tmin, ttraf) {

    var prune = d3.select("#prune1").classed("active");

    if (typeof nhab == 'undefined') nhab = nhabVal; //$( "#nsl_slider" ).slider( "value" );
    if (typeof tmin == 'undefined') tmin = tminVal; //$( "#w_slider" ).slider( "value" );
    if (typeof ttraf == 'undefined') tmin = ttrafVal; //$( "#w_slider" ).slider( "value" );

    // Nodes
    nodesPopDim.filter([nhab, Infinity]);
    var n = nodesPopDim.top(Infinity);
    nodeIds = d3.set(n.map(function(d) { return d.id; }));
    // console.log(nodeIds)

    // Links
    edgesWeightDim.filter([0, tmin]);
    // console.log(tmin)
    trafWeightDim.filter([ttraf, Infinity]);
    edgesConDim = efilter.dimension(function(d) {
        return nodeIds.has(d.from) && nodeIds.has(d.to);
    });
    edgesConDim.filter(function(d) { return d;});
    var e = edgesConDim.top(Infinity);
    edgesConDim.dispose();

    // Filter unconnected nodes
    var fromIds = e.map(function(d) { return d.from; });
    var toIds = e.map(function(d) { return d.to; });
    var edgeIds = d3.set(fromIds.concat(toIds));
    var ncon = nfilter.dimension(function(d) {
        return edgeIds.has(d.id);
    });
    ncon.filter(function(d) { return d; });
    n = ncon.top(Infinity);
    ncon.dispose();

    if (prune) {
        update(n, e);
    }
    else {
        node.classed("hidden", function(d) {
            return nodeIds.has(d.id) ? false : true;
        });

        edgeIds = d3.set(e.map(function(d) { return d.id; }));
        link.classed("hidden", function(d) {
            return edgeIds.has(d.id) ? false : true;
        });
    }

    var optArray = n.map(function(d) { return d.name;} ).sort();
    $(function () {
        $("#search").autocomplete({source: optArray});
    });


    // var num_neurons = d3.sum(n, function(d) { return d.type!="muscle" ? 1 : 0 });
    // document.getElementById('stats-n').innerHTML = num_neurons;
    // document.getElementById('stats-m').innerHTML = n.length - num_neurons;
    // document.getElementById('stats-s').innerHTML = d3.sum(e, function(d) { return d.type=="S" || d.type=="Sp" ? 1 : 0 });
    // document.getElementById('stats-ej').innerHTML = d3.sum(e, function(d) { return d.type=="EJ" ? 1 : 0 });
    // document.getElementById('stats-nmj').innerHTML = d3.sum(e, function(d) { return d.type=="NMJ" ? 1 : 0 });
}


function htmlForNode(d){
    var str =
        "Group: " + d.group + "<br>" +
        "Type: " + d.type + "<br>" +
        "Ganglion: " + d.AYGanglionDesignation + "<br>" +
        "Degrees:" + "<br>&emsp;" + "in " + d.inD + " out " + d.outD + " total " + d.population + "<br>";
    return str;
}

function htmlTabForNode(d){
    col = nodeColorScale(d.type);
    var str = '<p><span class="badge stats-item" style="background-color:'+col+'">' + d.type + '</span>'

    var mods = null;
    if ("modalities" in d) {
        mods = d.modalities.split(", ");
        for (var i = mods.length - 1; i >= 0; i--) {
            str += '<span class="badge badge-sm stats-item">' + mods[i] + '</span>';
        };
    }
    str += '</p>'

    if ("description_n4" in d && d.description_n4 != '') {
        str +=  '<p><b>Description</b>: ' + d.description_n4 + '</p>';
    }

    str += '<ul class="list-group">'
    if (d.type == 'muscle') {
        str +=
            '<li class="list-group-item"><span class="badge stats-item">' + d.part + '</span>Location</li>' +
            '<li class="list-group-item"><span class="badge stats-item">' + d.inD + '</span>In Degree</li>';
    }
    else {

        str +=
            // '<li class="list-group-item"><span class="badge stats-item">' + Number(d.Industries).toFixed(3) + '</span>Whatever</li>' +
            '<li class="list-group-item"><span class="badge stats-item">' + d.population + '</span>Población (2011)</li>' +
            '<li class="list-group-item"><span class="badge stats-item">' + d.Degree + '</span>Degree</li>' +
            '<li class="list-group-item"><span class="badge stats-item">' + Number(d["Weighted-Degree"]).toFixed(2) + '</span>W. Degree (M)</li>' +
            '<li class="list-group-item"><span class="badge stats-item">' + Number(d["Eigenvector"]).toFixed(2) + '</span>Eigenvector</li>';
            // '<li class="list-group-item"><span class="badge stats-item">' + d.Temp2 + '</span>Temp2</li>';

        str +=
            // '<li class="list-group-item"><span class="badge stats-item">' + Number(d["Closeness"]).toFixed(2) + '</span>Closeness</li>' +
            // '<li class="list-group-item"><span class="badge stats-item">' + Number(d["Betweenness"]).toFixed(2) + '</span>Betweenness</li>' +
            // '<li class="list-group-item"><span class="badge stats-item">' + Number(d["Clustering"]).toFixed(2) + '</span>Clustering</li>' +
            '<li class="list-group-item"><a target="_blank" href="' + "#" +
                '"><span class="glyphicon glyphicon-new-window pull-right"></span>Más Información...</a></li>';
    }
    str += '</ul>'
    return str;
}

function htmlTabForNode_1(d){
    col = nodeColorScale(d.type);
    var str = '<p><span class="badge stats-item" style="background-color:'+col+'">&nbsp</span><b>&nbsp' + d.name + '</b>';

    var mods = null;
    if ("modalities" in d) {
        mods = d.modalities.split(", ");
        for (var i = mods.length - 1; i >= 0; i--) {
            str += '<span class="badge badge-sm stats-item">' + mods[i] + '</span>';
        };
    }
    str += '</p>'


    if ("description_n4" in d && d.description_n4 != '') {
        str +=  '<p><b>Description</b>: ' + d.description_n4 + '</p>';
    }
    str +=  '<p><b>Group</b>: ' + d.group + '</p>';
    if ("notes" in d && d.notes != '') {
        str +=  '<p><b>Notes</b>: ' + d.notes + '</p>';
    }

    return str;
}

function removePopovers() {
  $('.popover').each(function() {
    $(this).remove();
  });
}

function showPopover(d, dir) {
  $(this).popover({
    title: "<a href='" + d.link + "'>" + d.name + "</a> (AYNbr: " + d.AYNbr + ")",
    placement: dir,
    container: 'body',
    trigger: 'manual',
    html : true,
    content: function() { return htmlForNode(d); }
  });
  $(this).popover('show');
}

function removeNodeInfo() {
    document.getElementById("nodeinfo").innerHTML = "Click para seleccionar...";
    document.getElementById("node-heading").innerHTML = "Estadísticas";


    //remove node info in statistics
    // document.getElementById('stats-n').innerHTML = "";
    // document.getElementById('stats-m').innerHTML = "";
    // document.getElementById('stats-s').innerHTML = "";
    // document.getElementById('stats-ej').innerHTML = "";
    // document.getElementById('stats-nmj').innerHTML = "";
}

function showNodeInfo(d) {
    //console.log(htmlTabForNode(d));
    document.getElementById("nodeinfo").innerHTML = htmlTabForNode(d);
    document.getElementById("node-heading").innerHTML = d.name;


    //display node info in statistics
    // document.getElementById('stats-n').innerHTML = d.Industries;
    // document.getElementById('stats-m').innerHTML = d.Business;
    // document.getElementById('stats-s').innerHTML = d.Tax;
    // document.getElementById('stats-ej').innerHTML = d.Temp1;
    // document.getElementById('stats-nmj').innerHTML = d.Temp2;

}

update = function(n, l) {
    nodes = n;
    links = l;
    buildAdjacency();
    // console.log("Updated:"+ nodes);
console.log(links[0].source.type)
// console.log(nodes[0])
    var c = Math.min(-700 + tminVal * 100, -250);
    var ld = Math.max(120 - tminVal * 10, 40);
    force.nodes(nodes)
        .links(links)
        .charge(c)
        .linkDistance(ld)
        .start();

    // Update links
    if (use_canvas) {
        console.log("a")
        //links.forEach(function(l) { l.opacity = linkOpacityDefault; });
        links.forEach(function(l) {
            l.opacity = linkOpacityScale(l.weight);
            l.strokeStyle = nodeColorScale(l.source.type);
            l.lineWidth = linkWeightScale(l.weight);
            
            // l.opacity = linkOpacityScale(l.weight);
            // l.strokeStyle = nodeColorScale(l.source.type);
            // l.lineWidth = linkWeightScale(l.weight);
        });
    } else {
        link = link.data(force.links(), function(d) { return d.id; });
        link.exit().remove();

        var a = link.enter().append("path");
        a.attr("class", "link")
            .classed("junction", function(d) { return (d.type == 'EJ' || d.type == 'NMJ')})
            .classed("hidden", function(d) { return (d.type=='EJ' && !showJunctions) || (d.type!='EJ' && !showSynapses); })
            .style("stroke-width", function(d) { return linkWeightScale(d.weight); })
            .style("stroke", function(d) { return nodeColorScale(d.source.type); })
            .style("opacity", linkOpacityDefault)
            .attr("id", function(d) { return d.id; })
            .on("mouseover", linkMouseOver)
            .on("mouseout", linkMouseOut);

        a.filter(function(d) { return d.type == "S" || d.type == "Sp"})
            .attr("marker-mid", function(d) { return "url(#" + nodeColorScale(d.source.type) + ")" });
    }

    // Update nodes
    node = node.data(force.nodes(), function(d) { return d.id; });

    var nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .on('click', function(d) {
            clicker(d, this);
        });
        // .call(drag);

    nodeEnter.append("circle")
        .attr("r", function(d) { return d.r; })
        .style("fill", function(d) { return nodeColorScale(d.type); });

    // add text to nodes
    // nodeEnter.append("text")
    //     .attr("class", "node-label")
    //     .attr("text-anchor", "middle")
    //     .attr("dy", "0.35em")
    //     .text(function(d) { return d.name; })
    //     .style("font-size", "6px");

    nodeEnter.on("mouseover", function(d) {
      if(!shortest_path_flag)
        connectedNodes(d);
      else{ //when in shortest path mode
        if(shortest_path_nodes.indexOf(d.id) != -1){
          connectedNodes(d);
        }
      }
    });

    nodeEnter.on("mouseout", function(d) {
      if(!shortest_path_flag)
        connectedNodes(null);
      else{ //when in shortest path mode
        if(shortest_path_nodes.indexOf(d.id) != -1){
          connectedNodes(null);
        }
        // subGraph();
      }
    });

    node.exit().remove();

    // If a node was selected before updating links, need to highlight again.
    restoreHighlight();

}

updateLinks = function(l) {

    links = l;
    force.links(links).start().on("tick", tick);

    if(use_canvas) {
        links.forEach(function(l) { l.opacity = linkOpacityDefault; });
    } else {
        link = link.data(force.links(), function(d) { return d.id; });
        link.exit().remove();

        var a = link.enter().append("path");
        a.attr("class", "link")
            .classed("junction", function(d) { return (d.type == 'EJ' || d.type == 'NMJ')})
            .classed("hidden", function(d) { return (d.type=='EJ' && !showJunctions) || (d.type!='EJ' && !showSynapses); })
            .style("stroke-width", function(d) { return linkWeightScale(d.weight); })
            .style("stroke", function(d) { return nodeColorScale(d.source.type); })
            .style("opacity", 0.25)
            .attr("id", function(d) { return d.id; })
            .on("mouseover", linkMouseOver)
            .on("mouseout", linkMouseOut);

        a.filter(function(d) { return d.type != "EJ"})
            .attr("marker-mid", function(d) { return "url(#" + nodeColorScale(d.source.type) + ")" });
    }

    // If a node was selected before updating links, need to highlight again.
    restoreHighlight();

    if(use_canvas)
        drawCanvas();
}

colToRgba = function (col, o) {
    c = d3.rgb(col);
    return "rgba(" + c.r + "," + c.g + "," + c.b + "," + o;
}

drawCanvas = function() {
    // console.log("da")
    var topLeft = map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(document.getElementsByTagName("canvas")[0], topLeft);
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(transX, transY);
    context.scale(scale, scale);
    
    
    
// console.log(transX,transY)
    highlighted = links.filter(function(x) { return x.opacity==linkOpacityHighlight; });
// console.log(highlighted)
    if (highlighted.length == 0 && links.length > numLinksDrawThresh) {
        // Draw simple background connections
        context.strokeStyle = "rgb(200,200,200)";
        context.beginPath();
        links.forEach(function (l) {
            const source=map.latLngToContainerPoint([l.source.lat, l.source.long])
            const target=map.latLngToContainerPoint([l.target.lat, l.target.long])
            drawLine(source.x, source.y, target.x, target.y);
        });
        context.stroke();
    } else {
        // Draw colored, weighted, arrowed foreground connections
        drawLinks = highlighted.length > 0 ? highlighted : links;
        if (highlighted.length == 0)
            context.globalAlpha = linkOpacityDefault;

        if (arcs) {
           drawLinks.forEach(function (l) {
                context.setLineDash(l.type == "EJ" ? [2,3] : []);
                context.strokeStyle = l.strokeStyle;
                context.fillStyle = l.strokeStyle;
                
                drawCurveArrow(l.source.x, l.source.y, l.target.x, l.target.y);
            });
        } else {
            drawLinks.filter(function(x) { return x.type != "EJ"; })
                .forEach(function(l) {
                    context.beginPath();
                    context.strokeStyle = l.strokeStyle;
                    context.lineWidth = l.lineWidth;
                    // context.setLineDash([]);
                    const source=map.latLngToContainerPoint([l.source.lat, l.source.long])
            const target=map.latLngToContainerPoint([l.target.lat, l.target.long])
                    drawLine(source.x, source.y, target.x, target.y);
                    context.stroke();
            });

            drawLinks.filter(function(x) { return x.type == "EJ"; })
                .forEach(function(l) {
                    context.beginPath();
                    context.strokeStyle = l.strokeStyle;
                    context.lineWidth = l.lineWidth;
                    context.setLineDash([2,3]);
                    const source=map.latLngToContainerPoint([l.source.lat, l.source.long])
            const target=map.latLngToContainerPoint([l.target.lat, l.target.long])
                    drawLine(source.x, source.y, target.x, target.y);
                    context.stroke();
            });

            drawLinks.forEach(function(l) {
                context.beginPath();
                context.fillStyle = nodeColorScale(l.source.type);
                // drawLineArrow(l.source.x, l.source.y, l.target.x, l.target.y);  <-- un-comment if you want to show arrows -->
                context.fill();
            });
        }
    }
    //col = colToRgba(nodeColorScale(l.source.type), l.opacity);
    //context.strokeStyle = col;
    //context.fillStyle = col;
    //context.lineWidth = linkWeightScale(l.weight);
    //context.strokeStyle = l.strokeStyle;
    //context.fillStyle = l.fillStyle;
    //context.lineWidth = l.lineWidth;
    context.restore();
    
}


tick = function() {
    force.on("tick", function(e) {

        // Add layer forces
        var k = 75 * e.alpha;
        nodes.forEach(function(n, i) {
            if(! n.fixed) {
                if (n.type.indexOf("muscle") > -1)// && n.y > 400)
                    n.y += 2*k;
                else if (n.type.indexOf("sensory") > -1)// && n.y > 400)
                    n.y -= k;
                else if (n.type.indexOf("motor") > -1)// && n.y < 600)
                    n.y += k;
                if (n.name.slice(-1) == "L")// && n.x > 400)
                    n.x -= k
                else if (n.name.slice(-1) == "R")// && n.x < 600)
                    n.x += k;
            }
        });

        node.each(collide(0.2));

        if (use_canvas) {
            drawCanvas();
        } else {
            
            if (arcs) {
                link.attr("d", function(d) {

                    // No midpoint
                    // var dx = d.target.x - d.source.x,
                    //     dy = d.target.y - d.source.y,
                    //     dr = Math.sqrt(dx * dx + dy * dy),
                    //     endx = d.target.x - dx/dr * d.target.r,
                    //     endy = d.target.y - dy/dr * d.target.r,
                    //     r = d.type=="Sp" ? 0 : d.type=="S" ? 1 : 2;
                    //     return "M" + d.source.x + "," + d.source.y + "A" + r*dr + "," + r*dr + " 0 0,1 " + endx + "," + endy;

                    // Midpoint
                    // var dx = d.target.x - d.source.x,
                    //     dy = d.target.y - d.source.y,
                    //     dr = Math.sqrt(dx * dx + dy * dy) / 2,
                    //     mx = d.source.x + dx,
                    //     my = d.source.y + dy,
                    //     r = d.type=="Sp" ? 0 : d.type=="S" ? 1 : 2;
                    //     return [
                    //         "M", d.source.x, d.source.y,
                    //         "A", dr, dr, 0,0,1, mx, my,
                    //         "A", dr, dr, 0,0,1, d.target.x, d.target.y
                    //     ].join(" ");

                    // // Midpoint v2
            //         d.target.x=map.latLngToLayerPoint([d.target.lat,d.target.long]).x
            // d.target.y=map.latLngToLayerPoint([d.target.lat,d.target.long]).y
            // d.source.x=map.latLngToLayerPoint([d.source.lat,d.source.long]).x
            // d.source.y=map.latLngToLayerPoint([d.source.lat,d.source.long]).y
                    var dx = d.target.x - d.source.x,
                        dy = d.target.y - d.source.y,
                        dr = Math.sqrt(dx * dx + dy * dy),
                        mx = (d.target.x + d.source.x) / 2,
                        my = (d.target.y + d.source.y) / 2,
                        len = dr - ((dr/2) * sqrt3),
                        dir = d.type=="S" ? 0 : 2;
                    if (d.type=="EJ") {
                        dr = 0;
                    }
                    else {
                        mx += (dir-1) * dy * len/dr;
                        my += -(dir-1) * dx * len/dr;
                    }

                    return [
                        "M", d.source.x, d.source.y,
                        "A", dr, dr, 0, 0, dir/2, mx, my,
                        "A", dr, dr, 0, 0, dir/2, d.target.x, d.target.y
                    ].join(" ");
                });
            }
            else {
                link.attr("d", function(d) {
            //         d.target.x=map.latLngToLayerPoint([d.target.lat,d.target.long]).x
            // d.target.y=map.latLngToLayerPoint([d.target.lat,d.target.long]).y
            // d.source.x=map.latLngToLayerPoint([d.source.lat,d.source.long]).x
            // d.source.y=map.latLngToLayerPoint([d.source.lat,d.source.long]).y
                    return [
                        "M", d.source.x, d.source.y,
                        "L", (d.source.x + d.target.x)/2, (d.source.y + d.target.y)/2,
                        "L", d.target.x, d.target.y
                    ].join(" ");
                });
            }
        }
        // node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
        node.attr("transform", function (d) {
          var tx = Math.round(d.x); var ty = Math.round(d.y);
          const ha=map.latLngToLayerPoint([d.lat,d.long]);
          d.x=ha.x
          d.y=ha.y
            if(!isNaN(d.x))
                return "translate(" + ha.x + "," + ha.y + ")";
            else
                // see which nodes are giving you an error
                //console.log(d)
                return "translate(0,0)";
            });
        //node.each(collide(0.2));
    });
}


dblclick_timer = false;
function clicker(d, elem) {
    if (d3.event.defaultPrevented) return;
    if (dblclick_timer) {
        clearTimeout(dblclick_timer);
        dblclick_timer = false;
        nodeDblClicked(d, elem);
    }
    else dblclick_timer = setTimeout( function() {
        dblclick_timer = false;
        nodeClicked(d);
    }, 200);
    d3.event.stopPropagation();
};



function nodeClicked(d) {
    // Mark selected node

    // setMapOnAll(null);
    // markOnMap(d);
    console.log("highlighted ID: "+ highlightId+", d.id: "+ d.id);
    if (highlightId != d.id) {
        showNodeInfo(d);
        toggleSelected(highlightId, false);
        highlightId = d.id;
        toggleSelected(highlightId, true);
        connectedNodes(d);

        // Filter interactivity
        node.on("mouseover", function (o) {
          if(!shortest_path_flag)
            return neighboring(d, o) | neighboring(o, d) ? connectedNodes(o) : null;
          else{ //when in shortest path mode
            return null;
            // console.log(d.id);
            // if(shortest_path_nodes.indexOf(d.id) != -1){
            //   return neighboring(d, o) | neighboring(o, d) ? connectedNodes(o) : null;
            // }
          }
        });

        node.on("mouseout", function (o) {
          if(!shortest_path_flag){
            document.getElementById("nodeinfo_footer").innerHTML = "";
            connectedNodes(null);
          }
          else{//when in shortest path mode
            return null;
          }
        });

        node.on("click", function (o) {
            // setMapOnAll(null);
            // markOnMap(o);
            return neighboring(d, o) | neighboring(o, d) ? clicker(o, this) : null;


        });
        node.call(drag);
        node.filter(function(o) {
            return !(neighboring(d, o) | neighboring(o, d));
        }).on("mousedown.drag", null);

    }
    else
    {
      node.on("mouseover", function(d) {

        if(!shortest_path_flag)
          connectedNodes(d);
        else{ //when in shortest path mode
          if(shortest_path_nodes.indexOf(d.id) != -1){
            connectedNodes(d);
          }
        }
      });
      node.on("mouseout", function(d) {

        if(!shortest_path_flag)
          connectedNodes(null);
        else{ //when in shortest path mode
          if(shortest_path_nodes.indexOf(d.id) != -1){
            connectedNodes(null);
          }
          // subGraph();
        }
      });
      node.on("click", function(d) { clicker(d, this); });
      node.call(drag);

      removeNodeInfo();

      toggleSelected(highlightId, false);
      highlightId = -1;
      connectedNodes(null);

        // if(shortest_path_flag){//when in shortest path mode
        //   subGraph();
        // }
    }
}

function connectedNodes(d) {
//   console.log(d);
    if (d != null) {
        if ((highlightId == -1) || (highlightId == d.id)) {
// console.log(highlightId)
            // Reduce the opacity of all but the neighbouring nodes
            node.style("opacity", function (o) {
              // console.log(d, o)
                return neighboring(d, o) | neighboring(o, d) ? nodeOpacityDefault : nodeOpacityBackground;
            });
            node.classed("selectable", function (o) {
                return neighboring(d, o) | neighboring(o, d) ? true : false;
            });

            if (use_canvas) {
                links.forEach(function(o) {
                    o.opacity = d.id==o.from | d.id==o.to ? linkOpacityHighlight : linkOpacityBackground;
                    //----------------------
                    //-----------------------
                    //-----------------------
                    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                    // o -> link
                    // o.opacity = (d.id==o.from | d.id==o.to) && o.weight > threshold [given by slider]? if true : if false
                    //  if true:  linkOpacityHighlight


                });
            } else {

                link.style("opacity", function (o) {
                    return d.id==o.from | d.id==o.to ? linkOpacityHighlight : linkOpacityBackground;
                });
                link.classed("selectable", function (o) {
                    return d.id==o.from | d.id==o.to ? true : false;
                });
            }
        }

        //display node info in foooter
        document.getElementById("nodeinfo_footer").innerHTML = htmlTabForNode_1(d);

    } else {

        if (highlightId != -1 || dragging){
            return;
        }

        if(shortest_path_flag){//when in shortest path mode
          node.on("mouseover", function(d) {

            if(!shortest_path_flag)
              connectedNodes(d);
            else{ //when in shortest path mode
              if(shortest_path_nodes.indexOf(d.id) != -1){
                connectedNodes(d);
              }
            }
          });
          node.on("mouseout", function(d) {

            if(!shortest_path_flag)
              connectedNodes(null);
            else{ //when in shortest path mode
              if(shortest_path_nodes.indexOf(d.id) != -1){
                connectedNodes(null);
              }
              // subGraph();
            }
          });
          node.on("click", function(d) { clicker(d, this); });
          subGraph();
        }
        else{
          node.style("opacity", nodeOpacityDefault);
          if(use_canvas) {
              // links.forEach(function(o) { o.opacity = linkOpacityDefault; });
              links.forEach(function(o) { o.opacity = linkOpacityScale(o.weight); });
          } else {
              link.style("opacity", linkOpacityDefault);
          };
          node.on("mouseover", function(d) {
            if(!shortest_path_flag)
              connectedNodes(d);
            else{ //when in shortest path mode
              if(shortest_path_nodes.indexOf(d.id) != -1){
                connectedNodes(d);
              }
            }
          });
          node.on("click", function(d) { clicker(d, this); });
          node.call(drag);
        }

        //remove node info in foooter
        document.getElementById("nodeinfo_footer").innerHTML = "";
        setMapOnAll(null);

    }

    if(use_canvas){
        drawCanvas();
    }
}

function restoreHighlight() {
    if (highlightId != -1) {
        d = nodes.filter(function(n) { return n.id == highlightId; })[0];
        if (d != undefined) {
            nodeClicked(d); // toggles un-highlight
            nodeClicked(d); // toggles re-highlight
        }
    }
}

function nodeDblClicked(d, elem) {
    d.fixed = false;
    d3.select(elem).select("circle").classed("fixed", false);
}

function dragstarted(d) {
    dragging = 1;
    d3.event.sourceEvent.stopPropagation();
}

function dragstopped(d) {
    dragging = 0;
    d3.event.sourceEvent.stopPropagation();
}

function dragged(d) {
    d3.event.sourceEvent.stopPropagation();
    d.fixed = true;
    d3.select(this).select("circle").classed("fixed", true);
}

function zoomed() {
    // if (use_canvas) {
        
    //     scale = d3.event.scale;
    //     transX = d3.event.translate[0];
    //     transY = d3.event.translate[1];
    //     console.log("scale")
    //     // drawCanvas();
    // }
    // container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

collide = function(alpha) {
    var padding = 1;

    var quadtree = d3.geom.quadtree(nodes);
    return function(d) {
        var radius = nodeRadiusScale(d.population);
        var rb = 2*radius + padding,
        nx1 = d.x - rb,
        nx2 = d.x + rb,
        ny1 = d.y - rb,
        ny2 = d.y + rb;
        quadtree.visit(function(quad, x1, y1, x2, y2) {
            if (quad.point && (quad.point !== d)) {
                var x = d.x - quad.point.x,
                y = d.y - quad.point.y,
                l = Math.sqrt(x * x + y * y);
                if (l < rb) {
                    l = (l - rb) / l * alpha;
                    d.x -= x *= l;
                    d.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                }
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
    };
}


function toggleSelected(i, b) {
    node.filter(function(n) { return n.id == i; })
        .select("circle").classed("selected", b);
}

function isSelectedLink(d) {
    if (highlightId != -1) {
        dh = nodes.filter(function(n) { return n.id == highlightId; })[0];
        return (dh.id == d.from | dh.id == d.to);
    }
    return false;
}

function linkMouseOver(d) {
  if(!shortest_path_flag){
    if (highlightId == -1 || isSelectedLink(d)) {
        d3.select(this).style("opacity", linkOpacityHighlight);
        container.append("text")
            .attr("class","labelText")
            .style("font-size", "9px")
            .style("fill", nodeColorScale(d.source.type))
            .attr("x", "50")
            .attr("y", "-20")
            .attr("dy", "-0.2em")
            .attr("text-anchor", "start")
            .append("textPath")
                .attr("xlink:href", '#' + d.id)
                .text(d.type + " " + d.weight);
    }
  }
}

function linkMouseOut(d) {
  if(!shortest_path_flag){
    if (highlightId == -1) {
        d3.select(this).style("opacity", linkOpacityDefault);
    }
    container.selectAll(".labelText").remove();
  }
}


function toggleSynapses(checkbox) {
    showSynapses = checkbox.checked;
    link.filter(function(d) {return d.type!="EJ"}).classed("hidden", !showSynapses);

}

function toggleJunctions(checkbox) {
    showJunctions = checkbox.checked;
    link.filter(function(d) {return d.type=="EJ"}).classed("hidden", !showJunctions);
}




function toggleArrows(checkbox) {
    showArrows = checkbox.checked;
    o = showArrows ? "visible" : "hidden";
    svg.selectAll("marker").attr("style", function(d) { return "fill: " + d + "; visibility:" + o +";"});
    if (use_canvas)
        drawCanvas();
}

function arcsplease(checkbox) {
    //force.stop();
    arcs = checkbox.checked;
    l = links;
    updateLinks([]);
    updateLinks(l);
}


// function searchNode() {
//     var selectedVal = document.getElementById('search-node').value;
//     var sel = node.filter(function(d) { return d.name == selectedVal; });
//     if(sel[0].length > 0) {
//         //showNodeInfo(sel.data()[0]);
//         nodeClicked(sel.data()[0]);
//         connectedNodes(sel.data()[0]);
//     }
//     else {
//         $('#search-node').addClass("alert-danger");
//     }
// }

function searchDescription_n4() {
    var selectedVal = document.getElementById('search-description_n4').value;
    // console.log(node[0]);
    var sel = node.filter(function(d) { return d.description_n4 == selectedVal; });
    if(sel[0].length > 0) {
        //showNodeInfo(sel.data()[0]);
        // console.log(sel[0].length);
        nodeClicked(sel.data()[0]);
        connectedNodes(sel.data()[0]);
    }
    else {
        $('#search-description_n4').addClass("alert-danger");
    }
}


function initNodePos(neurons) {
    neurons.forEach(function(d) {
        if (d.type.indexOf("sensory") > -1)
            d.y = 0;
        else if (d.type.indexOf("inter") > -1)
            d.y = height/2;
        else if (d.type.indexOf("motor") > -1)
            d.y = 3*height/4;
        else if (d.type.indexOf("muscle") > -1)
            d.y = height;

        if (d.name.slice(-2,-1) == "L")
            d.x = 0.25 * width;
        else if (d.name.slice(-1) == "R")
            d.x = 0.75 * width;

        // Fix AVAL and AVAR to the middle
        //if (d.name="AVAL")
        //d.fixed = true;
        // d.x = Math.round(0.55*width  - 3.3*(d.mapx))
        // d.y = 1.0*d.mapy + height/2
        // d.y = Math.round(0.40*height - 3.3*(d.mapy))
        var p = new L.LatLng(Number(d.lat), Number(d.long));             
                var layerPoint = map.latLngToLayerPoint(p);
                const ha=map.latLngToLayerPoint([d.lat,d.long]);
                d.x = ha.x;
                d.y = ha.y;
        // console.log(d)
        // d.x=Number(d.long)
        // d.y=Number(d.lat)
        // d.latLong = new L.LatLng(Number(d.long), Number(d.lat));
        // d.cx=Number(d.long)
        // d.cy=Number(d.lat)
        d.fixed = true
    });
   
}

function addNodeRadius(neurons) {
   neurons.forEach(function(d) { d.r = nodeRadiusScale(d.population); });
}


function setSlider(s, v) {
    $('#' + s + ' input').val(v);
    $('#' + s + ' output').val(v);
}


function graphReset() {
    // document.getElementById("resetbutton").innerHTML = '<img id="ajaxloader" src="/static/images/ajax-loader.gif">'
    // $.getJSON($SCRIPT_ROOT + '/_reset', function(d) {
    //     data = d.result;
    //     initNodePos(data.neurons);
    //     setSlider("ttraf", ttrafVal=2);
    //     setSlider("tmin", tminVal=3);
    //     setSlider("nhab", nhabVal=1);
    //     if (highlightId != -1){
    //         d = nodes.filter(function(n) { return n.id == highlightId; })[0];
    //         nodeClicked(d);
    //     }
    //     updateCrossFilter(data['neurons'], data['synapses']);
    //     document.getElementById("resetbutton").innerHTML = "Reset";
    //   });

    shortest_path_flag = false;
    shortest_path_nodes = [];
    shortest_path_endpoints.g1_b = null;
    shortest_path_endpoints.g2_b = null;
    node.style("opacity", nodeOpacityDefault);
    if (use_canvas) {
      links.forEach(function(o) {
          o.opacity = linkOpacityBackground;
      });
      update(data.neurons, data.synapses);
      filter(nhabVal, tminVal, ttrafVal);
      drawCanvas();
    }
    else{
      link.style("opacity", linkOpacityBackground);
      link.classed("selectable", false);
    }
    fetched = false;
    //$('#expandbutton').prop('disabled', true);
    $('#expandbutton').toggleClass('disabled', true);
    return false;
}





/* Query Pubmed utility functions */

/* This wraps when with individual done() callbacks
   http://stackoverflow.com/questions/26066198/jquery-when-progress-for-array-of-deferred-and-or-promise
*/
$.whenWithProgress = function(arrayOfPromises, progressCallback) {
   var cntr = 0;
   for (var i = 0; i < arrayOfPromises.length; i++) {
       arrayOfPromises[i].done(function() {
           progressCallback(++cntr, arrayOfPromises.length);
       });
   }
   return jQuery.when.apply(jQuery, arrayOfPromises);
}


// Retrieve a single neuron query from the app
function pubmed_single(name, query){
    return $.getJSON($SCRIPT_ROOT + '/_pubmed_single', {
        name: name,
        query: query
    });
}


function pubmed_progress(cnt, total) {
    percent = 100*(cnt/total);
    //spinner = '<img id="ajaxloader" src="/static/images/ajax-loader.gif">';
    document.getElementById("pmbutton").innerHTML = percent.toPrecision(3) + "% done";
}


/* This is a little complicated. First use an ajax call to get the names of neuron groups to query against.
   Then, for each name, create a new ajax call to perform the actual query. Using jquery deferred
   objects, we wait until all are resolved, then aggregate the filtered neuron groups into an array.
   Finally, we use that filtered list to get the corresponding graph in a last ajax call.
*/
function pubmed(){
    var query = document.getElementById('pmsearch').value;
    var threshold = document.getElementById('pubnumslider').value;
    var populateOnly = $('#pubmed-check').prop('checked');

    document.getElementById("pmbutton").innerHTML = '<img id="ajaxloader" src="/static/images/ajax-loader.gif">';
    $.getJSON($SCRIPT_ROOT + '/_group_names', {}, function(d) {
        groups = d.result;
        //groups = groups.slice(1,10);
        promises = $.map(groups, function(n) { return pubmed_single(n, query); });

        $.whenWithProgress(promises, pubmed_progress).then(function() {
            filtered_groups = [];
            for (var i = 0; i < arguments.length; i++) {
                result = arguments[i][0]['result'];
                if(result['count'] > threshold)
                    filtered_groups.push(result['name']);
            }

            // console.log(filtered_groups);
            if (populateOnly) {
                document.getElementById('group1').value = filtered_groups;
                document.getElementById('group2').value = filtered_groups;
                $("#subpanel").collapse({'toggle': false});
                $("#subpanel").collapse('show');
                $("#group1").highlight(2000, "#A8F582");
                $("#group2").highlight(2000, "#A8F582");
            } else {
                $.getJSON($SCRIPT_ROOT + '/_groups_graph', {
                        groups: filtered_groups
                    }, function(d) {
                    data = d.result;
                    setSlider("ttraf", ttrafVal=0);
                    setSlider("tmin", tminVal=0);
                    setSlider("nhab", nhabVal=0);
                    updateCrossFilter(data['neurons'], data['synapses']);
                });
            }
            document.getElementById("pmbutton").innerHTML = "Search Pubmed";
        });
    });
}


function expand() {
    if (fetched) {
        var name_list = nodes.map(function(d) { return d.name; });
        var muscles = ($('#mhead-check').prop('checked') ? "head," : "") +
                  ($('#mneck-check').prop('checked') ? "neck," : "") +
                  ($('#mbody-check').prop('checked') ? "body" : "");

        document.getElementById("expandbutton").innerHTML = '<img id="ajaxloader" src="/static/images/ajax-loader.gif">'
        $.getJSON($SCRIPT_ROOT + '/_expand', {
            names: name_list,
            muscles: muscles
          }, function(d) {
            data = d.result;
            setSlider("ttraf", ttrafVal=0);
            setSlider("tmin", tminVal=0);
            setSlider("nhab", nhabVal=0);
            updateCrossFilter(data['neurons'], data['synapses']);
            document.getElementById("expandbutton").innerHTML = "Expand"
          });
    }
    return false;
}

function subGraph() {

    var g1 = document.getElementById('group1').value;
    var [g1_a, g1_b] = g1.split(',');

    var g2 = document.getElementById('group2').value;
    var [g2_a, g2_b] = g2.split(',');

    if(g1_b != shortest_path_endpoints.g1_b || g2 != shortest_path_endpoints.g2_b){
      shortest_path_endpoints.g1_b = g1_b;
      shortest_path_endpoints.g2_b = g2_b;
      var paths = jsnx.shortestPath(G, {source: g1_b, target: g2_b});
      shortest_path_nodes = [];
      for(var kk in paths){
        shortest_path_nodes.push(paths[kk]);
      }
    }

    //reset link opacity
    setTimeout(function(){
      if (use_canvas) {
        links.forEach(function(o) {
            o.opacity = linkOpacityBackground;
        });
      }
      else{
        link.style("opacity", linkOpacityBackground);
        link.classed("selectable", false);
      }
      links = data.synapses;

      shortest_path_flag = true;
      node.style("opacity", function (o) {
          return shortest_path_nodes.indexOf(o.id) != -1 ? nodeOpacityDefault : nodeOpacityBackground;
      });
      if (use_canvas) {
        links.forEach(function(o) {
            o.opacity = (shortest_path_nodes.indexOf(o.from) != -1 && shortest_path_nodes.indexOf(o.to) != -1) ? linkOpacityHighlight : linkOpacityBackground;
        });
      }
      else{
        link.style("opacity", function (o) {
            return shortest_path_nodes.indexOf(o.from) != -1 && shortest_path_nodes.indexOf(o.to) != -1 ? linkOpacityHighlight : linkOpacityBackground;
        });
        link.classed("selectable", function (o) {
            return shortest_path_nodes.indexOf(o.from) != -1 && shortest_path_nodes.indexOf(o.to) != -1 ? true : false;
        });
      }
      drawCanvas();
    }, 200);


    // var rec = document.getElementById('rec-sel').value;
    var ws = document.getElementById('subwslider').value;
    var wj = document.getElementById('subjslider').value;
    var l = document.getElementById('subpslider').value;
    // var dir = $('#dirButton').text();
    // dir = dir == "↓" ? "uni" : "bi";
    // var muscles = ($('#mhead-check').prop('checked') ? "head," : "") +
    //               ($('#mneck-check').prop('checked') ? "neck," : "") +
    //               ($('#mbody-check').prop('checked') ? "body" : "");

    // document.getElementById("fetchbutton").innerHTML = '<img id="ajaxloader" src="/static/images/ajax-loader.gif">'
    // $.getJSON($SCRIPT_ROOT + '/_subgraph', {
    //     group1: g1_b,
    //     group2: g2_b,
    //     // receptors: rec,
    //     minWeightS: ws,
    //     minWeightJ: wj,
    //     maxLength: l,
    //     // dir: dir,
    //     // muscles: muscles
    //   }, function(d) {
    //     data = d.result;
    //     ttraf = tmin = nhab = 0;
    //     setSlider("ttraf", ttrafVal=0);
    //     setSlider("tmin", tminVal=0);
    //     setSlider("nhab", nhabVal=0);
    //     if (highlightId != -1){
    //         d = nodes.filter(function(n) { return n.id == highlightId; })[0];
    //         nodeClicked(d);
    //     }
    //     updateCrossFilter(data['neurons'], data['synapses']);
    //     document.getElementById("fetchbutton").innerHTML = "Fetch"
    //     $('#expandbutton').toggleClass('disabled', false);
    //     fetched = true;
    //   });
    //   return false;
}


function exportSvg() {
    var ctn = document.getElementById("graph");
    var svg = ctn.getElementsByTagName("svg")[0];
    var serializer = new XMLSerializer();
    var source = serializer.serializeToString(svg);
    //var style = "<?xml-stylesheet href='/static/css/d3.css' type='text/css'?>"
    return source;
}

function downloadPng() {
    // From https://github.com/exupero/saveSvgAsPng
    var ctn = document.getElementById("graph");
    var svg = ctn.getElementsByTagName("svg")[0];
    saveSvgAsPng(svg, "graph.png");
}


// -----------------------------------------------------------------
// Canvas drawing helpers
// -----------------------------------------------------------------
var arrow = [
    [2, 0],
    [-10, -4],
    [-10, 4]
];

function rotatePoint(ang, x, y) {
    return [
        (x * Math.cos(ang)) - (y * Math.sin(ang)),
        (x * Math.sin(ang)) + (y * Math.cos(ang))
    ];
};

function rotateShape(shape, ang) {
    var rv = [];
    for (p in shape)
        rv.push(rotatePoint(ang, shape[p][0], shape[p][1]));
    return rv;
};

function translateShape(shape, x, y) {
    var rv = [];
    for (p in shape)
        rv.push([shape[p][0] + x, shape[p][1] + y]);
    return rv;
};

function drawFilledPolygon(shape) {
    //context.beginPath();
    context.moveTo(shape[0][0], shape[0][1]);

    for (p in shape)
        if (p > 0)
            context.lineTo(shape[p][0], shape[p][1]);

    context.lineTo(shape[0][0], shape[0][1]);
    //context.fill();
};

function drawLine(x1, y1, x2, y2) {
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
};

function drawLineArrow(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var ang = Math.atan2(dy, dx);
    kx = x1 + 0.5*dx;
    ky = y1 + 0.5*dy;
    drawFilledPolygon(translateShape(rotateShape(arrow, ang), kx, ky));
};


function drawCurveArrow(x1, y1, x2, y2) {
    context.beginPath();
    context.moveTo(x1, y1);
    var k = draw_curve(x1, y1, x2, y2, 30);
    context.stroke();

    context.beginPath();
    var ang = Math.atan2(y2-y1, x2-x1);
    drawFilledPolygon(translateShape(rotateShape(arrow, ang), k.x, k.y));
    context.fill();
};



function draw_curve(Ax, Ay, Bx, By, M) {
    var dx = Bx - Ax,
        dy = By - Ay,
        dr = Math.sqrt(dx * dx + dy * dy);

    // side is either 1 or -1 depending on which side you want the curve to be on.
    // Find midpoint J
    var Jx = Ax + (Bx - Ax) / 2
    var Jy = Ay + (By - Ay) / 2

    // We need a and b to find theta, and we need to know the sign of each to make sure that the orientation is correct.
    var a = Bx - Ax
    var asign = (a < 0 ? -1 : 1)
    var b = By - Ay
    var bsign = (b < 0 ? -1 : 1)
    var theta = Math.atan(b / a)

    // Find the point that's perpendicular to J on side
    var costheta = asign * Math.cos(theta)
    var sintheta = asign * Math.sin(theta)

    // Find c and d
    var c = M * sintheta
    var d = M * costheta

    // Use c and d to find Kx and Ky
    var Kx = Jx - c
    var Ky = Jy + d
    // context.bezierCurveTo(Kx, Ky,Bx,By, Ax, Ax);
    context.quadraticCurveTo(Kx, Ky, Bx, By);

    // draw the ending arrowhead
    var endRadians = Math.atan((dx) / (dy));
    //context.stroke();

    var t = 0.5; // given example value

    var xx = (1 - t) * (1 - t) * Ax + 2 * (1 - t) * t * Kx + t * t * Bx;
    var yy = (1 - t) * (1 - t) * Ay + 2 * (1 - t) * t * Ky + t * t * By;

    var k = {};
    k.x = xx;
    k.y = yy;

    return k;
}
