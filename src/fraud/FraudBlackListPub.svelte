<script>
    import FraudBlackListPubSignUp 	 from "./FraudBlackListPubSignUp.svelte"    

    function signupPub(){
        window.$('#signup-pub').modal('show')
    }

</script>
<table class='fraud' id='fraud-black-list-pub'>
    <thead>
        <td class='pubid'>퍼블리셔 ID</td>
        <td class='pubid'>하위 퍼블리셔 ID</td>
        <td class='adpartner'>광고 파트너</td>
        <td>사유</td>
    </thead>
    <tbody>
        <tr>
            <td>pub_id</td>
            <td>subpub_id</td>
            <td>애드팝콘</td>
            <td></td>
        </tr>
        <tr>
            <td>pub_id</td>
            <td>subpub_id</td>
            <td>애드팝콘</td>
            <td></td>
        </tr>
        <tr>
            <td>pub_id</td>
            <td>subpub_id</td>
            <td>애드팝콘</td>
            <td></td>
        </tr>
        <tr>
            <td>pub_id</td>
            <td>subpub_id</td>
            <td>애드팝콘</td>
            <td></td>
        </tr>
        <tr>
            <td>pub_id</td>
            <td>subpub_id</td>
            <td>애드팝콘</td>
            <td></td>
        </tr>
        <tr>
            <td>pub_id</td>
            <td>subpub_id</td>
            <td>애드팝콘</td>
            <td></td>
        </tr>
        <tr>
            <td>pub_id</td>
            <td>subpub_id</td>
            <td>애드팝콘</td>
            <td></td>
        </tr>
    </tbody>
</table>
<button type="button" class="btn btn-primary" on:click={signupPub} data-dismiss="modal">등록</button>

<FraudBlackListPubSignUp/>