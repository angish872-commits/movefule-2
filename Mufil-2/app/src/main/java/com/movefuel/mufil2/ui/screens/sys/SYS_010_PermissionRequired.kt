package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS010PermissionRequiredScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_010",
        title = "Permission Required",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_011,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SYS_009,
        onNavigate = onNavigate,
    ) {
            MFNotice("Permission required","MoveFuel explains why the feature needs access before the system prompt appears.","Continue")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS010PermissionRequiredScreenPreview() {
    MoveFuelTheme { SYS010PermissionRequiredScreen {} }
}
