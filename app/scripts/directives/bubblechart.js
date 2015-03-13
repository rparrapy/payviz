'use strict';

/**
 * @ngdoc directive
 * @name payvizApp.directive:bubbleChart
 * @description
 * # bubbleChart
 */
angular.module('payvizApp')
  .directive('bubbleChart', function ($timeout) {
    return {
      restrict: 'E',
      replace: false,
      scope: { data: '=' , until: '='},
      link: function postLink(scope, element, attrs) {
        String.prototype.toProperCase = function () {
          return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
        };
        var data = scope.data;
        var filteredData = data;
        var size = { 
                    'all' : [435, 410],
                    'rubro_nombre' : [900, 900],
                    'pro_nombre_vista' : [900,1200], 
                    'mod_nombre' : [900,400],
                    'componente' : [900,450], 
                    'obra_vista': {
                                  'pavimentadas': [900, 250],
                                  'no-pavimentadas': [900, 350],
                                  'fortalecimiento': [900, 500]
                    }
                  };
        var width = 750, height = 750;
        var maxElem = _.max(data, function(c){ return c.monto_total; });
        var minElem = _.min(data, function(c){ return c.monto_total; });
        //console.log(maxElem.monto_total);
        //console.log(minElem.monto_total);
        //console.log(minElem.monto_total/maxElem.monto_total);
        var area = d3.scale.sqrt().domain([0, maxElem.monto_total]).range([0, 50]);
        var popactual = null;
        var popClearInterval = null;
        var lastSelectedDate = moment(); 
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
          var componente = $('#componentes .active').attr('id');
          if(!componente || contrato.componente === componente){
            //console.log('mostrar imagen');
            imagen.show();
          }

          if(hasta){
            d3.select('#' + gradientId + " stop.color").attr('offset', ejecutado.toFixed(2)).style('stop-color', fillColor);
            d3.select('#' + gradientId + " stop.blank").attr('offset', ejecutado.toFixed(2)).style('stop-color', bgColor);

            if(contrato['adendas']){
              if(_.every(contrato.adendas, function(adenda){ return moment(adenda.fecha_contrato) > limite; })){
                imagen.hide();
              }
            }
            if(!contrato.is_adenda){
              var displayContrato = d3.select('#circulo'+contrato.id).style('display');

              if(displayContrato == 'none'){
                imagen.hide();
              }
            }

          } else {
            if(d3.select('#' + gradientId).empty()){
              var grad = svg.append('defs').append('linearGradient').attr('id', gradientId)
              .attr('x1', '0%').attr('x2', '0%').attr('y1', '100%').attr('y2', '0%');
              grad.append('stop').attr('class', 'color').attr('offset', ejecutado.toFixed(2)).style('stop-color', fillColor);
              grad.append('stop').attr('class', 'blank').attr('offset', ejecutado.toFixed(2)).style('stop-color', bgColor);
            }
          }

          return 'url(#' + gradientId + ')';
        };

        var stroke = function(contrato, hasta){
          return contrato.is_adenda ? '#006289' : '#ca4600';
        }

        var opacity = function(contrato, hasta){
          var limite = hasta || moment();
          return (contrato.fecha_contrato && moment(contrato.fecha_contrato) > limite) ? 0.0 : 1.0;
        }

        var radius = function(contrato, hasta){
          var cobrado, limite;
          limite = hasta || moment();
          if(contrato.cod_contrato){
            return area(contrato.monto_total);
          }else{
            cobrado = _.reduce(contrato.imputaciones, function(sum, imputacion){
              if(moment(imputacion.fecha_obl) <= limite){
                return sum + imputacion.monto; 
              }else{
                return sum;
              }
            }, 0);
            return area(cobrado);
          }
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
                .attr('xlink:href', 'images/ico_dinero.svg')
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
            data[j].id_filtrado = (data[j].cod_contrato) ? data[j].cod_contrato : data[j].rubro_cod + '-' +  j.toString();
            data[j].radius = area(data[j].monto_total);
            data[j].x = Math.random() * width;
            data[j].y = Math.random() * height;
            data[j].is_adenda = false;
            data[j].pro_nombre_vista = data[j].pro_nombre;
            //data[j].obra_vista = data[j].obra
            data[j].obra_vista = (data[j].obra === undefined) ? data[j].rubro_nombre.toProperCase() : data[j].obra;
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
                adendas[i].obra_vista = data[j].obra;
                adendas[i].componente = data[j].componente;
                adendas[i].obra = data[j].obra;
                adendas[i].is_adenda = true;
                ndata.push(adendas[i]);
            }
            
          }

        }
        data = ndata;

        //console.log(data);
        //var sinContrato = _.chain(data).filter(function(e){return e.cod_contrato == undefined; }).value();
        //console.log(sinContrato);
        
        var padding = 5;
        var maxRadius = d3.max(_.pluck(data, 'radius'));

        var getCenters = function (vname, size) {
          var centers, map;
          var circulitos;
          
          if(vname !== 'all'){
            circulitos = _.countBy(_.pluck(filteredData, vname), function(d) { return d; } );
            circulitos = _.mapObject(circulitos, function(d){ return 0; });
            _.each(filteredData, function(d){ circulitos[d[vname]] += parseInt(d.monto_total); });
          }

          var montos = _.map(circulitos, function(num, key) { return num;});
          var montoTotalCirculitos = _.reduce(montos, function(memo, num){ return memo + num; }, 0);
          var montoTotal = _.reduce(filteredData, function(memo, contrato){ return memo + parseInt(contrato.monto_total); }, 0);
          //console.log(filteredData);

          centers = _.uniq(_.pluck(filteredData, vname)).map(function (d) {
            var m = _.has(circulitos, d) ? circulitos[d] : montoTotal;
            var c = (circulitos === undefined || d === undefined) ? 0 : circulitos[d];
            var v = (c > 150000000000) ? 10 : 1;
            return {name: d, value: v, cantidad : c, monto: m};
          });
          //console.log(centers);

          switch(vname){
            case 'pro_nombre_vista':
              centers = truncateCenters(centers, 15, 'pro_nombre_vista');
              break;
          }
          //console.log(centers);
          map = d3.layout.treemap().size(size).ratio(1).sort(function(a,b){return a.cantidad - b.cantidad});
          map.nodes({children: centers});

          switch(vname){
            case 'rubro_nombre':
              centers = moveCentersByRubro(centers);
              break;
            case 'mod_nombre':
              centers = moveCentersByTipo(centers);
              break;
            case 'componente':
              centers = moveCentersByComponente(centers);
              break;
          }
          return sortCenters(centers);
        };

        var sortCenters = function(centers){
          //TODO
          var positions = _.map(centers, function(c){
            return {x: c.x, y: c.y, dx: c.dx, dy: c.dy};
          });

          positions.sort(function(a, b){
            if(a.y !== b.y){
              return b.y - a.y;
            }else{
              return b.x - a.x;
            }
          });

          _.each(centers, function(c, i){
            c.x = positions[i].x
            c.y = positions[i].y
            c.dx = positions[i].dx
            c.dy = positions[i].dy
          });

          return centers;
        }

        var truncateCenters = function(centers, number, varname) {
          var montoOtros = 0;
          var ncenter = [];
          
          centers = _.sortBy(centers, function(o) { return -o.cantidad });

          if(centers.length > number){
            for(var i=0; i<centers.length; i++){
              if( i < number - 1 ){
                ncenter.push(centers[i]);
              }else{
                _.each(filteredData, function(d){
                  if( d[varname] === centers[i].name ){
                    d[varname] = 'Otros';
                    montoOtros += centers[i].monto
                  }
                })
              }
            }
            ncenter.push({ name: 'Otros', value : 1, cantidad : 0, monto: montoOtros});
          }else{
            _.each(centers, function(c){ if(c.name === 'Otros') c.cantidad = 0; });
            ncenter = centers;
          }
          return ncenter;
        };

        var moveCentersByTipo = function(centers){
          return moveLeft(centers, 100);
        };

        var moveCentersByComponente = function(centers){
          return moveLeft(centers, 175);
        };

        var moveLeft = function(centers, delta){
          _.each(centers, function(c){
            c.x -= delta;
          });
          return centers;
        };

        var moveCentersByRubro = function(centers){
          var colsToMove = 3; // number of columns to "lift"
          var bigDy = _.last(centers).dy;
          var smallDy = _.first(centers).dy;
          var smallDx = _.first(centers).dx;
          var numberOfColumns = _.chain(centers)
                                  .groupBy(function(c){ return c.y; })
                                  .map(function(g){ return g.length; })
                                  .max().value();

          var bubblesToMove = numberOfColumns - colsToMove;

          var lastRow = _.chain(centers)
                              .initial()
                              .map(function(c){ return c.y; })
                              .uniq()
                              .sortBy(function(x){return x;})
                              .last()
                              .value();

          var lastColumns = _.chain(centers)
                              .initial()
                              .map(function(c){ return c.x; })
                              .uniq()
                              .sortBy(function(x){return x;})
                              .last(colsToMove)
                              .value();

          _.each(centers, function(c, i){
            if(c.name === 'CONSTRUCCIONES'){
              c.x -= 300;
            }

            if(_.contains(lastColumns, c.x)){
              c.y -= bigDy;
            }

            if(c.y === lastRow && !_.contains(lastColumns, c.x)){
              c.x += bubblesToMove * smallDx;
              c.y -= smallDy;
            }
          });
          resizeSvg(width, height - smallDy);
          return centers;
        }

        var componenteMap = {
                        'pavimentadas': 'REHAB. Y MANT. DE LA RED DE RUTAS PAVIMENTADAS',
                        'no-pavimentadas': 'MEJ. Y MANT. DE LA RED DE RUTAS NO PAVIMENTADAS',
                        'fortalecimiento': 'FORTALECIMIENTO INSTITUCIONAL'
                      };

        var nodes = svg.selectAll('circle')
          .data(data);

        //console.log(nodes);

        nodes.enter().append('circle')
          .attr('id', function(d){ return (d.is_adenda ? 'circulo-adenda' + d.padre + d.pos : 'circulo' + d.id); })
          .attr('class', function(d){ return 'node ' + _.invert(componenteMap)[d.componente]})
          .attr('cx', function (d) { return d.x; })
          .attr('cy', function (d) { return d.y; })
          .attr('r', function (d) {  return d.radius; })
          .attr('stroke', function(d){ return stroke(d); })
          .attr('opacity', function(d){ return opacity(d); })
          .style('fill', function (d) { return fill(d); })
          .on('mouseover', function (d) { showPopover.call(this, d, scope.until); })
          .on('mouseout', function (d) { removePopovers(true); })
          .on('click', function(d){ 
            window.seleccionado = d.cod_contrato; 

          });
        
        var force = d3.layout.force();

        draw('all');

        $( '.btn' ).click(function() {
          var componente = $(this).attr('id');
          var varname = $(this).attr('name');
          if(varname === 'componente'){
            $('#componentes').show();
            $('[name="obra_vista"]').removeClass('active');
          }else{
            if(varname !== 'obra_vista'){
              $('#componentes').hide();
            }
          }

          if(varname === 'all'){
            $('.referencias').show();
          }else{
            $('#search-box').val('');
            $('.referencias').hide();
          }

          draw(varname, componente);
        });

        scope.$watch('until',function(until){
          //No se porque es necesaria esta primera linea
          if(until){
            lastSelectedDate = until.toDate();
          }
          nodes.attr('opacity', function(d){ return opacity(d, until);})
            .attr('r', function (d) {  return radius(d, until); })
            .style('fill', function (d) { return fill(d, until); });
        });


        $("#search-box").keyup( function(){ 
            var search = $("#search-box").val();
            //console.log("this is sparta ... " + search);

            //draw('all');
            $("label[name=all]").click();

            filterBySearch(search);

        });


 
      function getTextOf(d) {


            var crudo = '{categoria_nombre} {monto_total} '+
                    '{ejecutado}% '+
                    '{pro_nombre} '+
                    '{fecha_contrato} '+
                    '{llamado_nombre} {cod_contrato} '+
                    '{monto_pagado} '+
                    '{mod_nombre} '+
                    '{obra} ';
              if(d.is_adenda) { d = d.p_data;}
              return crudo.replace('{categoria_nombre}', typeof d.categoria_nombre !== "undefined" ? d.categoria_nombre : '')
                .replace('{monto_total}', typeof d.monto_total !== "undefined" ? parseInt(d.monto_total).toLocaleString() : 'No aplica')
                .replace('{ejecutado}', typeof d.ejecutado !== "undefined" ? (d.ejecutado * 100).toFixed(0) : 'No aplica')
                .replace('{pro_nombre}', typeof d.pro_nombre !== "undefined" ? d.pro_nombre : 'No aplica')
                .replace('{fecha_contrato}', typeof d.fecha_contrato !== "undefined" ? d.fecha_contrato : 'No aplica')
                .replace('{llamado_nombre}', typeof d.llamado_nombre !== "undefined" ? d.llamado_nombre : 'No aplica')
                .replace('{cod_contrato}', typeof d.cod_contrato !== "undefined" ? d.cod_contrato : 'No aplica')
                .replace('{monto_pagado}', typeof d.monto_pagado !== "undefined" ? d.monto_pagado.toLocaleString() : 'No aplica')
                .replace('{mod_nombre}', typeof d.mod_nombre !== "undefined" ? d.mod_nombre : 'No aplica')
                .replace('{obra}', typeof d.obra !== "undefined" ? d.obra : d.rubro_nombre.toProperCase());
        }




        function filterBySearch(s){

          var excludedData;
          var displayedData;
          filteredData = data;

          //console.log("Lo que busco...")
          //console.log(s);
          
          _.each(filteredData, function(d){
            $('#img-' + d.cod_contrato).show();
          });


          excludedData = _.filter(data, function(d){
              var text = getTextOf(d);
              return ( text.toLowerCase().indexOf(s.trim().toLowerCase()) == -1 );
            });

          displayedData = _.filter(data, function(d){
              var text = getTextOf(d);
              return ( text.toLowerCase().indexOf(s.trim().toLowerCase()) != -1 );
            });

          _.each(excludedData, function(d){
              $('#img-' + d.cod_contrato).hide();
              d3.select('#circulo' + d.id).style('display','none');
              if(d.is_adenda) d3.select('#circulo-adenda' + d.padre + d.pos).style('display','none');

          });

          _.each(displayedData, function(d){
              $('#img-' + d.cod_contrato).show();
              d3.select('#circulo' + d.id).style('display','block');
          });

          //console.log(displayedData);
          //console.log(excludedData);
          
        }

        function setPosAdenda(d){
          if(d.p_data){
            var angulos = [0,72,150,216,288,360];

            d.x = d.p_data.x + Math.cos( (angulos[d.pos] * 180 ) / Math.PI ) * d.p_data.radius ;
            d.y = d.p_data.y - Math.sin( (angulos[d.pos] * 180 ) / Math.PI ) * d.p_data.radius  ;
          }
        }

        function resizeSvg(width, height){
          svg
            .attr('width', width)
            .attr('height', height);
        }

        function draw (varname, componente) {
          if(componente){
            width = size[varname][componente][0];
            height = size[varname][componente][1];
          }else{
            width = size[varname][0];
            height = size[varname][1];
          }
          resizeSvg(width, height);
          filterData(componente, varname);
          var centers = getCenters(varname, [width, height]);
          force.on('tick', tick(centers, varname, componente));
          labels(centers,varname);
          force.start();
        }

        function filterData(id, vname){
          var visibleNodes = nodes;
          var hiddenNodes = [];
          var excludedData;
          filteredData = (vname === 'obra_vista') ? _.filter(data, function(d){
            return d.componente === componenteMap[id];
          }) : data;


          _.each(filteredData, function(d){
            $('#img-' + d.cod_contrato).show();
          });

          if(id){
            excludedData = _.filter(data, function(d){
              return d.componente !== componenteMap[id];
            });

            _.each(excludedData, function(d){
              $('#img-' + d.cod_contrato).hide();
            });

            visibleNodes = svg.selectAll('circle.' + id);
            hiddenNodes = svg.selectAll('circle:not(.' + id + ')');
            hiddenNodes.style('display', 'none');
          }
          visibleNodes.style('display', 'block');
          $timeout(function(){
            scope.$apply(function(){
              scope.until = moment(lastSelectedDate);
            });
          });
        }

        function tick (centers, varname, componente) {
          var foci = {};
          for (var i = 0; i < centers.length; i++) {
            foci[centers[i].name] = centers[i];
          }
          return function (e) {
            var visibleNodes = nodes;
            if(componente){
              visibleNodes = svg.selectAll('circle.' + componente);
            }
            for (var i = 0; i < filteredData.length; i++) {
              var o = filteredData[i];
              var f = foci[o[varname]];
              o.y += ((f.y + (f.dy / 2)) - o.y) * e.alpha;
              o.x += ((f.x + (f.dx / 2)) - o.x) * e.alpha;
            }
            visibleNodes.each(collide(.15))
              .attr('cx', function (d) {  return d.x; })
              .attr('cy', function (d) { imagen(d); return d.y; });

          };
        }

        function labels (centers,varname) {
          svg.selectAll('.label').remove();
          svg.selectAll('.monto-label').remove();


          svg.selectAll('.label')
          .data(centers).enter().append('text')
          .attr('class', 'label')
          .attr('text-anchor', 'start')
          .text(function (d) {
            var exceptions = ['pro_nombre_vista', 'obra_vista'];
            var label;
            if(d.name && !_.contains(exceptions, varname)){ label = d.name.toProperCase(); }else{ label = d.name; }
            if(label){
              label = label.length > 45 ? label.slice(0, 42) + '...' :  label;
            }
            return d.name !== undefined || varname === 'all' ? label : 'No aplica'; 
          })
          .attr('transform', function (d) {
            return 'translate(' + (d.x + ((d.dx - this.getComputedTextLength())/2)) + ', ' + (d.y > 0 ? d.y - 5 : 15) + ')';
          })

          svg.selectAll('.monto-label')
          .data(centers).enter().append('text')
          .attr('class', 'monto-label')
          .attr('text-anchor', 'start')
          .attr('fill', '#666')
          .text(function (d) {
            return (varname === 'all') ? 'Monto Total de Contratos: Gs. ' + d.monto.toLocaleString() : 'Gs. ' + d.monto.toLocaleString(); 
          })
          .attr('transform', function (d) {
            return 'translate(' + (d.x + ((d.dx - this.getComputedTextLength())/2)) + ', ' + (d.y > 0 ? d.y + 10 : 30) + ')';
          })
          //.call(wrap, 100);
        }

        function wrap(text, width) {
  
          text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                diff;
            //console.log(words);
            diff = -40;
            var word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = parseFloat(text.attr("y")),
                dy = parseFloat(text.attr("dy")),
                //dx = parseFloat(text.attr("dx")),
            y = y + diff;
            var tspan = text.text(null).append("tspan").attr("x", -50).attr("y", y).attr("dy", dy + "em");
           
            while (word = words.pop()) {
              line.push(word);
              tspan.text(line.join(" "));
              if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", -50).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
              }
            }
          });
        }

        var cursorOnPopover = false;
        $('.popover').on('mouseenter', null, function() { cursorOnPopover = true; });
        $('.popover').on('mouseleave', null, function() { cursorOnPopover = false; });

        function removePopovers (esperar) {
          if(!esperar || $('.popover').length > 1){
            if((!cursorOnPopover && $('.popover').length === 1) || $('.popover').length > 1){
              $('.popover:first').each(function() {
                $(this).remove();
                popactual = null;
              });
            }else{
              if($('.popover').length > 0){
                _.delay(removePopovers, 200, false);
              }              
            }
          }else{
            //console.log('false');
            if($('.popover').length > 0){
              _.delay(removePopovers, 200, false);
            }
          }
        }

        function showPopover (d, hasta) {
          window.setLista = function setLista(id_filtrado){
            removePopovers(false);
            window.seleccionado = id_filtrado;
            window.location = window.location + 'data';
          }
          $(this).popover({
            placement: 'auto right',
            container: 'body',
            trigger: 'manual',
            html : true,
            content: function() {


              var crudo = '<div class="tooltipo padding10"> <table> <tbody> <tr> <td> {categoria_nombre} <br><br> Monto total<br><h5>Gs. {monto_total}</h5> </td>'+
                    '<td rowspan="2" class="txtC" width="30%"> Monto ejecutado<br> <h1 class="per_ejex">{ejecutado}%</h1> </td> </tr> <tr> '+
                    '<td> Proveedor<br> <h6>{pro_nombre}</h6> </td> </tr> </tbody> </table> <hr> <table class="tab_sec mb10">'+
                    ' <tbody> <tr> <td width="50%"> Fecha de contrato<br> <strong>{fecha_contrato}</strong> </td> <td> Nombre del llamado<br>'+
                    ' <strong>{llamado_nombre}</strong> </td> </tr> <tr> <td> Código de contratación<br> <strong>{cod_contrato}</strong> </td>'+
                    ' <td> Monto ya pagado<br> <strong>Gs. {monto_pagado}</strong> </td> </tr> <tr> <td> Tipo de licitación<br> '+
                    '<strong>{mod_nombre}</strong> </td> <td> Obra<br> '+
                    '<strong>{obra}</strong> </td> </tr> </tbody> </table> <p class="txtC">'+
                    ( d.is_adenda ? '' : '<a onClick="setLista(\''+d.id_filtrado+'\')">Click para ver más detalles</a></p> ')+
                    '</div>';
              if(d.is_adenda) { d.categoria_nombre = 'Adenda';}
              return crudo.replace('{categoria_nombre}', typeof d.categoria_nombre !== "undefined" ? d.categoria_nombre : '')
                .replace('{monto_total}', typeof d.monto_total !== "undefined" ? parseInt(d.monto_total).toLocaleString() : 'No aplica')
                .replace('{ejecutado}', typeof d.ejecutado !== "undefined" ? (d.ejecutado * 100).toFixed(0) : 'No aplica')
                .replace('{pro_nombre}', typeof d.pro_nombre !== "undefined" ? d.pro_nombre : 'No aplica')
                .replace('{fecha_contrato}', typeof d.fecha_contrato !== "undefined" ? d.fecha_contrato : 'No aplica')
                .replace('{llamado_nombre}', typeof d.llamado_nombre !== "undefined" ? d.llamado_nombre : 'No aplica')
                .replace('{cod_contrato}', typeof d.cod_contrato !== "undefined" ? d.cod_contrato : 'No aplica')
                .replace('{monto_pagado}', typeof d.monto_pagado !== "undefined" ? d.monto_pagado.toLocaleString() : 'No aplica')
                .replace('{mod_nombre}', typeof d.mod_nombre !== "undefined" ? d.mod_nombre : 'No aplica')
                .replace('{obra}', typeof d.obra !== "undefined" ? d.obra : d.rubro_nombre.toProperCase());

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
            //removePopovers(false);
            $(this).popover('show');
          }
            
          $('.popover').on('mouseenter', null, function() { cursorOnPopover = true; });
          $('.popover').on('mouseleave', null, function() { cursorOnPopover = false; });
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
