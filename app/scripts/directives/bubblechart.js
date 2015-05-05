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
                      'rubro_nombre' : [800, 1100],
                      'pro_nombre_vista' : [900,1200],
                      'mod_nombre' : [665,450],
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
          var totalProyectoDolares = 105410000;
          var cotizacion = 4812;
          var totalProyecto = totalProyectoDolares * cotizacion;
          var currentCenters, currentVarname;
          var montoCobrado = function(contrato, hasta){
            return _.reduce(contrato.imputaciones, function(sum, imputacion){
              return (moment(imputacion.fecha_obl) <= hasta) ? sum + imputacion.monto : sum;
            }, 0);
          };
          var montoCobradoAdendas = function(contrato,hasta){
            var imputaciones = _.flatten(_.pluck(_.filter(contrato.adendas,function(adenda){
              return (adenda.tipo === 'Amp de monto' || adenda.tipo === 'Reajuste.' || adenda.tipo === 'Renovación');
            }), 'imputaciones'));

            return  _.reduce(imputaciones, function(sum, imputacion){
              return (moment(imputacion.fecha_obl) <= hasta) ? sum + imputacion.monto : sum;
            },0)
          }
          var fill = function(contrato, hasta){
            var limite = hasta || moment();
            //Cambiamos un poco para tener en cuenta las adendas de tiempo
            var is_adenda_tiempo = contrato.is_adenda && contrato.tipo === 'Amp de plazos';
            var cobrado = is_adenda_tiempo ? 0 : montoCobrado(contrato, limite);
            var ejecutado = is_adenda_tiempo ? 1 : cobrado/contrato.monto_total;

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
            var fecha = (contrato['fecha_contrato']) ? moment(contrato['fecha_contrato']) : moment(contrato['fecha_primer_pago']);
            return (fecha && fecha > limite) ? 0.0 : 1.0;
          }

          var radius = function(contrato, hasta){
            //No se dibuja el circulo correspondiente a una adenda de tiempo.
            var isAdendaTiempo = (contrato.tipo === 'Amp de plazos');
            if(isAdendaTiempo) return 0;
            var cobrado, limite;
            limite = hasta || moment();
            if(contrato.cod_contrato){
              return contrato.radius;
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
            if(_.has(contrato,'adendas') && contrato['adendas'].length > 0){
              var src_img = null;

              if( _.filter(contrato['adendas'], function(adenda){ return (adenda.tipo === 'Amp de plazos'); }).length > 0 ){
                src_img = 'ico_tiempo.svg';
              }

              if(_.filter(contrato['adendas'], function(adenda){ return (adenda.tipo === 'Amp de monto' || adenda.tipo === 'Reajuste.' || adenda.tipo === 'Renovación'); }).length > 0){
                if(src_img === null){
                  src_img = 'ico_dinero.svg';
                }else{
                  src_img = 'ico_ambos.png';
                }
              }

              var imgScale = (src_img === 'ico_ambos.png') ? 2 : 4; 

              if(!imagen.empty()){
                imagen
                .attr('x', contrato.x - contrato.radius / imgScale)
                .attr('y', contrato.y - contrato.radius / imgScale);

              }else{
                imagen = svg
                  .append('image')
                  .attr('id', imgId)
                  .attr('xlink:href', 'images/' + src_img )
                  .attr('width', contrato.radius / imgScale * 2)
                  .attr('height', contrato.radius / imgScale * 2)
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
                  adendas[i].id_filtrado = data[j].id_filtrado;
                  adendas[i].padre = j;
                  adendas[i].p_data = data[j];
                  adendas[i].monto_total = adendas[i].tipo === 'Amp de plazos' ? 0 : adendas[i].monto;
                  adendas[i].radius = adendas[i].tipo === 'Amp de plazos' ? area(data[j].monto_total * 0.1) : area(adendas[i].monto_total);
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
                  adendas[i].cod_contrato = adendas[i].tipo === 'Amp de plazos' ? data[j].id_filtrado + '-adenda-tiempo' : adendas[i].cod_contrato;
                  ndata.push(adendas[i]);
                  //console.log(adendas[i]);
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
              var aRoundY = Math.floor(a.y / 10) * 10;
              var bRoundY = Math.floor(b.y / 10) * 10;

              if(aRoundY !== bRoundY){
                return bRoundY - aRoundY;
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
            return moveLeft(centers, 50);
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
            var colsToMove = 2; // number of columns to "lift"
            var rowsToMove = 2;
            var bigDy = _.last(centers).dy;
            var smallDy = _.first(centers).dy;
            var smallDx = _.first(centers).dx;
            var numberOfColumns = _.chain(centers)
                                    .groupBy(function(c){ return c.y; })
                                    .map(function(g){ return g.length; })
                                    .max().value();

            var numberOfRows = _.chain(centers)
                                    .initial()
                                    .groupBy(function(c){ return c.x; })
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

            var lastRows = _.chain(centers)
                                .initial()
                                .map(function(c){ return c.y; })
                                .uniq()
                                .sortBy(function(y){return y;})
                                .last(numberOfRows - rowsToMove)
                                .value();

            _.each(centers, function(c, i){
              if(c.name === 'CONSTRUCCIONES'){
                c.x -= 200;
              }

              if(_.contains(lastColumns, c.x)){
                if(_.contains(lastRows, c.y)){
                  c.y -= smallDy * rowsToMove;
                }else{
                  c.y -= bigDy;
                }
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
              setLista(d.id_filtrado);
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
            labels(currentCenters, currentVarname, until);
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
            currentVarname = varname;
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
            currentCenters = centers;
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

          function getMontoTotalAdendas(contrato,fecha){
            //El metodo es analogo a lo que se realizo para sumar los montos del
            // contrato, se tiene en cuenta que solo existen adendas con
            // fecha_contrato debido al filter en main.js
            if(contrato.adendas && contrato.adendas.length > 0){
              //console.log(fecha);
              var totalAdendas = _.reduce(contrato.adendas, function(memo,a){
                //console.log(a['fecha_contrato'])

                var fadenda = moment(a['fecha_contrato']);
                return ( fadenda <= fecha && a['tipo'] !== 'Amp de plazos') ? a['monto'] + memo : memo;
              },0);
              return totalAdendas;
            }
            return 0;
          }

          function labels (centers, varname, until) {
            var limite = until || moment();
            var totalALaFecha = 0, totalEjecutado = 0, labelAll = '', porcentajeEjecutado = 0;
            if(varname === 'all'){
              totalALaFecha = _.reduce(filteredData, function(memo, c){
                  var fecha = (c['fecha_contrato']) ? moment(c['fecha_contrato']) : moment(c['fecha_primer_pago']);
                  return (fecha <= limite.toDate()) ? c['monto_total'] + getMontoTotalAdendas(c,limite.toDate()) + memo : memo;
                }, 0);
              totalEjecutado = _.reduce(filteredData, function(memo, c){ return montoCobrado(c, limite) + montoCobradoAdendas(c,limite) + memo; }, 0);
              porcentajeEjecutado = (totalEjecutado/totalALaFecha * 100).toFixed(0);
              porcentajeEjecutado = isNaN(porcentajeEjecutado) ? 0 : porcentajeEjecutado;
              labelAll = 'Total Ejecutado: Gs. ' + totalEjecutado.toLocaleString() + ' (' + porcentajeEjecutado.toLocaleString() + '% del monto total de contratos)';
            }

            svg.selectAll('.label').remove();
            svg.selectAll('.monto-label').remove();
            //Del total del proyecto, cuanto se destino a contratos

            svg.selectAll('.label')
            .data(centers).enter().append('text')
            .attr('class', 'label')
            .attr('text-anchor', 'start')
            .text(function (d) {
              var exceptions = ['pro_nombre_vista', 'obra_vista'];
              var label, porcentajeContratacion;
              if(varname === 'all'){
                porcentajeContratacion = d.monto / totalProyecto * 100;
                //label = 'Monto Total de Contratos: Gs. ' + d.monto.toLocaleString() + '(' + porcentajeContratacion.toLocaleString() +'% del monto total del proyecto)';
                label = 'Monto Total de Contratos: Gs. ' + totalALaFecha.toLocaleString();
              }else{
                if(d.name && !_.contains(exceptions, varname)){ label = d.name.toProperCase(); }else{ label = d.name; }
                if(label){
                  label = label.length > 45 ? label.slice(0, 42) + '...' :  label;
                }
              }
              return d.name !== undefined || varname === 'all' ? label : 'No aplica';
            })
            .attr('transform', function (d) {
              if(varname === 'all'){
                //este valor se deberia de calcular de manera automatica.
                return 'translate(38.3642578125 , ' + (d.y > 0 ? d.y - 5 : 15) + ')'
              }
              return 'translate(' + (d.x + ((d.dx - this.getComputedTextLength())/2)) + ', ' + (d.y > 0 ? d.y - 5 : 15) + ')';
            })



            svg.selectAll('.monto-label')
            .data(centers).enter().append('text')
            .attr('class', 'monto-label')
            .attr('text-anchor', 'start')
            .attr('fill', '#666')
            .text(function (d) {
              return (varname === 'all') ? labelAll : 'Gs. ' + d.monto.toLocaleString();
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
          var cursorOnImage = false;
          //$('.popover').on('mouseenter', null, function() { cursorOnPopover = true; });
          //$('.popover').on('mouseleave', null, function() { cursorOnPopover = false; });

          function removePopovers (esperar) {
            if(cursorOnImage) return;
            if(!esperar || $('.popover').length > 1){
              if((!cursorOnPopover && $('.popover').length === 1) || $('.popover').length > 1){
                $('.popover:first').each(function() {
                  $(this).remove();
                  popactual = null;
                });
              }else{
                if($('.popover').length > 0){
                  _.delay(removePopovers, 50, false);
                }
              }
            }else{
              //console.log('false');
              if($('.popover').length > 0){
                _.delay(removePopovers, 50, false);
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


            var crudo = '<div class="tooltipo padding10">' +
           '    <table>' +
           '        <tbody>' +
           '' +
           '            <tr>' +
           '            <td style="min-width:300px;" colspan="2">' +
           '                     <strong>{llamado_nombre}</strong>' +
           '            </td>' +
           '            </tr>' +
           '            <tr>' +
           '                <td colspan="2">' +
           '                    <h6>{pro_nombre}</h6>' +
           '                </td>' +
           '            </tr>' +
           '            <tr style="min-width:320px;">' +
           '                <td width="*">' +
           '' +
           '                    Monto total: ' +
           '                    ' +
           '                    Gs. {monto_total}' +
           '                </td>' +
           '                <td  style="padding:0px;text-align:right;white-space:nowrap;">' +
                            'Monto ejecutado: ' +
           '                    <span class="per_ejex">{ejecutado}%</span>' +
           '                </td>' +
           '            </tr>' +
           '' +
           '        </tbody>' +
           '    </table>' +
           '    <hr style="margin:0px;">' +
           '' +
           '    <center><p style="font-size:12px;margin-bottom:0px;margin-top:5px;color:#666;">Click en el círculo para ver más detalles</p></center>' +
           '</div>';
                if(d.is_adenda) { d.categoria_nombre = 'Adenda';}
                return crudo
                  .replace('{monto_total}', typeof d.monto_total !== "undefined" ? parseInt(d.monto_total).toLocaleString() : 'No aplica')
                  .replace('{ejecutado}', typeof d.ejecutado !== "undefined" ? (d.ejecutado * 100).toFixed(0) : 'No aplica')
                  .replace('{pro_nombre}', typeof d.pro_nombre !== "undefined" ? d.pro_nombre : 'No aplica')
                  .replace('{llamado_nombre}', typeof d.llamado_nombre !== "undefined" ? (d.llamado_nombre.length > 80 ? d.llamado_nombre.slice(0,77) + '...' : d.llamado_nombre) : 'No aplica');

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

          //$('.popover').on('mouseenter', null, function() { cursorOnPopover = true; });
          //$('.popover').on('mouseleave', null, function() { cursorOnPopover = false; });
            $('image').on('mouseenter', null, function() { cursorOnImage = true; });
            $('image').on('mouseleave', null, function() { cursorOnImage = false; });
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
