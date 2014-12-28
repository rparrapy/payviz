'use strict';

/**
 * @ngdoc directive
 * @name payvizApp.directive:bubbleChart
 * @description
 * # bubbleChart
 */
angular.module('payvizApp')
  .directive('bubbleChart', function () {
    return {
      restrict: 'E',
      replace: false,
      scope: { data: '=' },
      link: function postLink(scope, element, attrs) {
        var data = scope.data;
        var width = 1000, height = 1000;
        var maxElem = _.max(data, function(c){ return c.monto_total });
        var minElem = _.min(data, function(c){ return c.monto_total });
        console.log(maxElem.monto_total);
        console.log(minElem.monto_total);
        console.log(minElem.monto_total/maxElem.monto_total);
        var area = d3.scale.sqrt().domain([0, maxElem.monto_total]).range([0, 50]);
        var fill = d3.scale.ordinal().range(['#827d92','#827354','#523536','#72856a','#2a3285','#383435']);
        var svg = d3.select(element[0]).append('svg')
            .attr('width', width)
            .attr('height', height);

        for (var j = 0; j < data.length; j++) {
          data[j].radius = area(data[j].monto_total);
          data[j].x = Math.random() * width;
          data[j].y = Math.random() * height;
        }

        var padding = 2;
        var maxRadius = d3.max(_.pluck(data, 'radius'));

        var getCenters = function (vname, size) {
          var centers, map;
          centers = _.uniq(_.pluck(data, vname)).map(function (d) {
            return {name: d, value: 1};
          });

          map = d3.layout.treemap().size(size).ratio(1/1);
          map.nodes({children: centers});

          return centers;
        };

        var nodes = svg.selectAll('circle')
          .data(data);

        nodes.enter().append('circle')
          .attr('class', 'node')
          .attr('cx', function (d) { return d.x; })
          .attr('cy', function (d) { return d.y; })
          .attr('r', function (d) { return d.radius; })
          .style('fill', function (d) { return fill(d.rubro_nombre); })
          .on('mouseover', function (d) { showPopover.call(this, d); })
          .on('mouseout', function (d) { removePopovers(); });

        var force = d3.layout.force();

        draw('rubro_nombre');

        $( '.btn' ).click(function() {
          draw(this.id);
        });

        function draw (varname) {
          var centers = getCenters(varname, [width, height]);
          force.on('tick', tick(centers, varname));
          labels(centers);
          force.start();
        }

        function tick (centers, varname) {
          var foci = {};
          for (var i = 0; i < centers.length; i++) {
            foci[centers[i].name] = centers[i];
          }
          return function (e) {
            for (var i = 0; i < data.length; i++) {
              var o = data[i];
              var f = foci[o[varname]];
              o.y += ((f.y + (f.dy / 2)) - o.y) * e.alpha;
              o.x += ((f.x + (f.dx / 2)) - o.x) * e.alpha;
            }
            nodes.each(collide(.11))
              .attr('cx', function (d) { return d.x; })
              .attr('cy', function (d) { return d.y; });
          };
        }

        function labels (centers) {
          svg.selectAll(".label").remove();

          svg.selectAll(".label")
          .data(centers).enter().append("text")
          .attr("class", "label")
          .attr("text-anchor", "start")
          .text(function (d) { return d.name })
          .attr("transform", function (d) {
            return "translate(" + (d.x + ((d.dx - this.getComputedTextLength())/2)) + ", " + (d.y + 15) + ")";
          });
        }

        function removePopovers () {
          $('.popover').each(function() {
            $(this).remove();
          }); 
        }

        function showPopover (d) {
          $(this).popover({
            placement: 'auto top',
            container: 'body',
            trigger: 'manual',
            html : true,
            content: function() { 
              return 'Proveedor: ' + d.pro_nombre + '<br/>Modalidad: ' + d.mod_nombre + 
                     '<br/>Categoria: ' + d.categoria_nombre + '<br/>Monto: ' + d.monto_total; 
            }
          });
          $(this).popover('show');
        }

        function collide(alpha) {
          var quadtree = d3.geom.quadtree(data);
          return function (d) {
            var r = d.radius + maxRadius + padding,
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
            quadtree.visit(function(quad, x1, y1, x2, y2) {
              if (quad.point && (quad.point !== d)) {
                var x = d.x - quad.point.x,
                    y = d.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = d.radius + quad.point.radius + padding;
                if (l < r) {
                  l = (l - r) / l * alpha;
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
      }
    };
  });
