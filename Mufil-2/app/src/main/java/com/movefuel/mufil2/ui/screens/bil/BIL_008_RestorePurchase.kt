package com.movefuel.mufil2.ui.screens.bil

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun BIL008RestorePurchaseScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "BIL_008",
        title = "Restore Purchase",
        subtitle = "Subscription and purchase states.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WAR_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BIL_007,
        onNavigate = onNavigate,
    ) {
            MFStageList(listOf("Checking account","Checking platform purchases","Restoring entitlement"),1)
            MFNotice("Restore","No charge is initiated by restore purchase.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun BIL008RestorePurchaseScreenPreview() {
    MoveFuelTheme { BIL008RestorePurchaseScreen {} }
}
