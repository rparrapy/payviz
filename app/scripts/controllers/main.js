'use strict';

/**
 * @ngdoc function
 * @name payvizApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the payvizApp
 */
angular.module('payvizApp')
  .controller('MainCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
    $('.tips, .referencias, hr:last').show();
    //Keep active nav-pill updated
    $(document).ready(function() {
      $(".nav.nav-pills li").on("click",function(){
        //Fix routing problem inside iframe
        var url = $(this).children().first()[0].href;
        window.location = url;
      });
    });

    var contratos = [];
    angular.copy(imputaciones, contratos);

    for (var i = 0; i < contratos.length; i++){
      var c = contratos[i];
      if(!c.monto_total){
        c.monto_total = _.reduce(c.imputaciones,function(sum, el) { return sum + el.monto },0);
      }
      if(!c.fecha_contrato){
        c.fecha_primer_pago = _.sortBy(c.imputaciones, function(i){ return moment(i.fecha_contrato); })[0];
      }
      //temporalmente
      c.adendas = _.filter(c.adendas, function(adenda){
        return (adenda.tipo === 'Amp de monto' || adenda.tipo === 'Reajuste.' || adenda.tipo === 'Renovación') && adenda['fecha_contrato']; 
      });
    }


    $scope.data = contratos;
    //$scope.$apply();
  });
