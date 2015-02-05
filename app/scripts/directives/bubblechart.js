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
      scope: { data: '=' , until: '='},
      link: function postLink(scope, element, attrs) {
        var data = scope.data;
        var size = { 'all' : [900,400],'rubro_nombre' : [900, 1200],'pro_nombre_vista' : [900,1000], 'mod_nombre' : [900,900],'componente' : [900,900] };
        var width = 750, height = 750;
        var maxElem = _.max(data, function(c){ return c.monto_total; });
        var minElem = _.min(data, function(c){ return c.monto_total; });
        console.log(maxElem.monto_total);
        console.log(minElem.monto_total);
        console.log(minElem.monto_total/maxElem.monto_total);
        var area = d3.scale.sqrt().domain([0, maxElem.monto_total]).range([0, 50]);
        var popactual = null;
        var fill = function(contrato, hasta){
          var limite = hasta || moment();
          var cobrado = _.reduce(contrato.imputaciones, function(sum, imputacion){
            if(moment(imputacion.fecha_obl) <= limite){
              return sum + imputacion.monto; 
            }else{
              return sum;
            }
          }, 0);
          var ejecutado = cobrado/contrato.monto_total;
          var fillColor = contrato.is_adenda ? '#00698C' : '#f56727' ;
          var bgColor = contrato.is_adenda ? '#bfdfff' : '#ffead4';
          var gradientId = 'grad-' + contrato.cod_contrato;

          //Agrego aca, pero deberiamos hacer en otra parte
          contrato.ejecutado = ejecutado.toFixed(2);
          contrato.monto_pagado = cobrado;

          var imgId = 'img-' +  contrato.cod_contrato;
          var imagen = $('#' + imgId);
          imagen.show();


          if(hasta){
            d3.select('#' + gradientId + " stop.color").attr('offset', ejecutado.toFixed(2)).style('stop-color', fillColor);
            d3.select('#' + gradientId + " stop.blank").attr('offset', ejecutado.toFixed(2)).style('stop-color', bgColor);

            if(contrato.fecha_contrato && moment(contrato.fecha_contrato) > limite){
              imagen.hide();
            }


          } else {
            var grad = svg.append('defs').append('linearGradient').attr('id', gradientId)
            .attr('x1', '0%').attr('x2', '0%').attr('y1', '100%').attr('y2', '0%');
            grad.append('stop').attr('class', 'color').attr('offset', ejecutado.toFixed(2)).style('stop-color', fillColor);
            grad.append('stop').attr('class', 'blank').attr('offset', ejecutado.toFixed(2)).style('stop-color', bgColor);  
          }

          return 'url(#' + gradientId + ')';
        };

        var stroke = function(contrato, hasta){
          return contrato.is_adenda ? '#006289' : '#ca4600';
        }

        var opacity = function(contrato, hasta){
          var limite = hasta || moment();
          var result = 1.0;
          return (contrato.fecha_contrato && moment(contrato.fecha_contrato) > limite) ? 0.0 : 1.0;
        }

        var imagen = function(contrato){
          var imgId = 'img-' +  contrato.cod_contrato;
          var imagen = d3.select('#' + imgId );
          if(_.has(contrato,'adendas')){
            if(!imagen.empty()){
              imagen
              .attr('x', contrato.x - contrato.radius/4)
              .attr('y', contrato.y - contrato.radius/4);

            }else{
              imagen = svg
                .append('image')
                .attr('id', imgId)
                .attr('xlink:href', 'images/ico_dinero.png')
                .attr('width', contrato.radius*0.5)
                .attr('height', contrato.radius*0.5)
                .on('mouseover', function (d) { showPopover.call(d3.select('#circulo'+contrato.id), contrato); });

            }
          }
        };

        var svg = d3.select(element[0]).append('svg')
            .attr('width', width)
            .attr('height', height);

        //Esto claramente es un alambre, se deberia mejorar y hacer de manera mas corta con _
        var ndata = [];


        for (var j = 0; j < data.length; j++) {
          
            data[j].id = j;
            data[j].radius = area(data[j].monto_total);
            data[j].x = Math.random() * width;
            data[j].y = Math.random() * height;
            data[j].is_adenda = false;
            data[j].pro_nombre_vista = data[j].pro_nombre;
            ndata.push(data[j]);
            if(data[j].adendas){
              var adendas = data[j].adendas;
              for(var i=0; i < adendas.length; i++){
                adendas[i].padre = j;
                adendas[i].p_data = data[j];
                adendas[i].monto_total = adendas[i].monto;
                adendas[i].radius = area(adendas[i].monto_total);
                adendas[i].x = data[j].x + data[j].radius - adendas[i].radius;
                adendas[i].y = data[j].y + data[j].radius - adendas[i].radius;
                adendas[i].pos = i;
                adendas[i].rubro_nombre = data[j].rubro_nombre;
                adendas[i].mod_nombre = data[j].mod_nombre;
                adendas[i].pro_nombre = data[j].pro_nombre;
                adendas[i].pro_nombre_vista = data[j].pro_nombre;
                adendas[i].componente = data[j].componente;
                adendas[i].is_adenda = true;
                ndata.push(adendas[i]);
            }
            
          }

        }
        data = ndata;

        //console.log(data);

        var padding = 5;
        var maxRadius = d3.max(_.pluck(data, 'radius'));

        var getCenters = function (vname, size) {
          var centers, map;
          var circulitos;
          if(vname !== 'all'){
            circulitos = _.countBy(_.pluck(data, vname),function(d) { return d } );
          }

          _.each(data, function(d){ 
              if(d[vname])
                circulitos[d[vname]] += parseInt(d.monto_total);
          });
          var montos = _.chain(circulitos).map(function(num, key) { return num;});
          var maximoMonto = _.chain(circulitos).map(function(num, key) { return num;}).max().value();
          var minimoMonto = montos.min().value();
          var montoToSquareSize = d3.scale.quantize().domain([minimoMonto, maximoMonto]).range(_.range(1,5));
      
          centers = _.uniq(_.pluck(data, vname)).map(function (d) {
            var c = _.has(circulitos,d) ? circulitos[d] : 0;
            var v = (c > 150000000000) ? 8 : 1;
            return {name: d, value: v, cantidad : c};
          });

          centers = _.sortBy(centers, function(o) { return o.cantidad });

          //console.log(centers);
          if(vname == 'pro_nombre_vista'){
              centers = centers.filter(function( obj ) {
                  return obj.name !== 'OTROS';
              });
              centers.reverse();
              var ncenter = []
              for(var i=0; i<centers.length; i++){
                  if( i < 11 ){
                    ncenter.push(centers[i]);
                  }else{
                    _.each(data,function(d){
                      if( d.pro_nombre_vista == centers[i].name ){
                        d.pro_nombre_vista = 'OTROS';
                      }
                    })
                  }
              }
              ncenter.push({ name: 'OTROS', value : 1, cantidad : 0 });
              centers = ncenter;

          }else{

            //console.log(centers);
            // if( centers.length > 1 ){
            //   var falta = Math.ceil(centers.length / 3) * 3 - centers.length;
            //   for(var i = 0; i < falta; i++){
            //     centers.push({ name: null, value : 1, cantidad : -1 });
            //   }
            // }

          }
          map = d3.layout.treemap().size(size).ratio(1).sort(function(a,b){return a.cantidad - b.cantidad});
          map.nodes({children: centers});
          


          return centers;
        };

        var nodes = svg.selectAll('circle')
          .data(data);

        //console.log(nodes);

        nodes.enter().append('circle')
          .attr('id', function(d){ return 'circulo' + d.id; })
          .attr('class', 'node')
          .attr('cx', function (d) { return d.x; })
          .attr('cy', function (d) { return d.y; })
          .attr('r', function (d) {  return d.radius;})
          .attr('stroke', function(d){ return stroke(d); })
          .attr('opacity', function(d){ return opacity(d); })
          .style('fill', function (d) { return fill(d); })
          .on('mouseover', function (d) { showPopover.call(this, d, scope.until); })
          .on('mouseout', function (d) { removePopovers(); });


        
        //console.log(nodes);
              
        
        var force = d3.layout.force();

        draw('all');

        $( '.btn' ).click(function() {
          draw(this.id);
        });

        scope.$watch('until',function(until){
          //No se porque es necesaria esta primera linea
          if(until){
            until.toDate();
          }
          nodes.attr('opacity', function(d){ return opacity(d, until);})
            .style('fill', function (d) { return fill(d, until); });
        });


        function setPosAdenda(d){
          if(d.p_data){
            var angulos = [0,72,150,216,288,360];

            d.x = d.p_data.x + Math.cos( (angulos[d.pos] * 180 ) / Math.PI ) * d.p_data.radius ;
            d.y = d.p_data.y - Math.sin( (angulos[d.pos] * 180 ) / Math.PI ) * d.p_data.radius  ;
          }
        }

        function resizeSvg(){
          svg
            .attr('width', width)
            .attr('height', height);
        }

        function draw (varname) {
          width = size[varname][0];
          height = size[varname][1];
          resizeSvg();
          var centers = getCenters(varname, [width, height]);
          force.on('tick', tick(centers, varname));
          labels(centers,varname);
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
            nodes.each(collide(.15))
              .attr('cx', function (d) {  return d.x; })
              .attr('cy', function (d) { imagen(d); return d.y; });

          };
        }

        function labels (centers,varname) {
          svg.selectAll('.label').remove();

          svg.selectAll('.label')
          .data(centers).enter().append('text')
          .attr('class', 'label')
          .attr('text-anchor', 'start')
          .text(function (d) { return d.name !== undefined || varname === 'all' ? d.name : 'No aplica'; })
          .attr('transform', function (d) {
            return 'translate(' + (d.x + ((d.dx - this.getComputedTextLength())/2)) + ', ' + (d.y > 0 ? d.y - 5 : 15) + ')';
          });
        }

        function removePopovers () {
          $('.popover').each(function() {
            $(this).remove();
            popactual = null;
          }); 
        }

        function showPopover (d, hasta) {
          
          $(this).popover({
            placement: 'auto right',
            container: 'body',
            trigger: 'manual',
            html : true,
            content: function() {


              var crudo = '<div class="tooltipo padding10"> <table> <tbody> <tr> <td> {categoria_nombre} <br> <h5>Gs. {monto_total}</h5> </td>'+
                    '<td rowspan="2" class="txtC" width="30%"> Monto ejecutado<br> <h1 class="per_ejex">{ejecutado}%</h1> </td> </tr> <tr> '+
                    '<td> Proveedor<br> <h6>{pro_nombre}</h6> </td> </tr> </tbody> </table> <hr> <table class="tab_sec mb10">'+
                    ' <tbody> <tr> <td width="50%"> Fecha de contrato<br> <strong>{fecha_contrato}</strong> </td> <td> Nombre del llamado<br>'+
                    ' <strong>{llamado_nombre}</strong> </td> </tr> <tr> <td> Código de contratación<br> <strong>{cod_contrato}</strong> </td>'+
                    ' <td> Monto ya pagado<br> <strong>Gs. {monto_pagado}</strong> </td> </tr> <tr> <td> Tipo de licitación<br> '+
                    '<strong>{mod_nombre}</strong> </td> <td> </td> </tr> </tbody> </table> <p class="txtC">'+
                    '<!--a href="#">Click para ver más detalles</a--></p> </div>';
              if(d.is_adenda) { d.categoria_nombre = 'Adenda';}
              return crudo.replace('{categoria_nombre}', typeof d.categoria_nombre !== "undefined" ? d.categoria_nombre : 'No aplica')
                .replace('{monto_total}', typeof d.monto_total !== "undefined" ? parseInt(d.monto_total).toLocaleString() : 'No aplica')
                .replace('{ejecutado}', typeof d.ejecutado !== "undefined" ? (d.ejecutado * 100).toFixed(0) : 'No aplica')
                .replace('{pro_nombre}', typeof d.pro_nombre !== "undefined" ? d.pro_nombre : 'No aplica')
                .replace('{fecha_contrato}', typeof d.fecha_contrato !== "undefined" ? d.fecha_contrato : 'No aplica')
                .replace('{llamado_nombre}', typeof d.llamado_nombre !== "undefined" ? d.llamado_nombre : 'No aplica')
                .replace('{cod_contrato}', typeof d.cod_contrato !== "undefined" ? d.cod_contrato : 'No aplica')
                .replace('{monto_pagado}', typeof d.monto_pagado !== "undefined" ? d.monto_pagado.toLocaleString() : 'No aplica')
                .replace('{mod_nombre}', typeof d.mod_nombre !== "undefined" ? d.mod_nombre : 'No aplica');

              ( typeof metadata_title  !== "undefined" ?  "<title>" + metadata_title + "</title>\n"                             : "" )
              
              /*return ( typeof d.pro_nombre !== "undefined" ? 'Proveedor: ' + d.pro_nombre : '' ) + 
                     ( typeof d.mod_nombre !== "undefined" ? '<br/>Modalidad: ' + d.mod_nombre : '' ) + 
                     ( typeof d.categoria_nombre !== "undefined" ? '<br/>Categoria: ' + d.categoria_nombre : '') + 
                     ( typeof d.monto_total !== "undefined" ? '<br/>Monto: ' + d.monto_total : '') + 
                     ( typeof d.padre !== "undefined" ? '<br/>ES ADENDA!' : '' ); */
            }
          });

          var limite = hasta || moment();
          var isBubbleVisible = !(d.fecha_contrato && moment(d.fecha_contrato) > limite); 

          if(popactual !== d && isBubbleVisible){
            popactual = d;
            $(this).popover('show');
          }
            

        }
        var PRI = true;
        function collide(alpha) {
          var quadtree = d3.geom.quadtree(data);
          return function (d) {
            var r = d.radius + maxRadius + padding,
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
            quadtree.visit(function(quad, x1, y1, x2, y2) {
              if (quad.point && (quad.point !== d) ) {
                var x = d.x - quad.point.x,
                    y = d.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = d.radius + quad.point.radius + padding;

                if( quad.point.id === d.padre ){
                  setPosAdenda(d);
                }else{
                  if (l < r) {
                    l = (l - r) / l * alpha;
                    d.x -= x *= l;
                    d.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                  }
                }
              }

              return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
          };
        }
      }
    };
  });
